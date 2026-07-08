<script setup lang="ts">
import type { Socket } from 'socket.io-client'
import type { ComponentPublicInstance } from 'vue'
import { useAuthStore } from '~/stores/auth'

type VideoParticipant = {
  socketId: string
  userId: string
  displayName: string
  role?: 'admin' | 'manager' | 'employee' | 'supplier'
}

type RemoteParticipant = VideoParticipant & {
  stream: MediaStream | null
  connectionState: RTCPeerConnectionState
}

type JoinRoomResponse = {
  ok: boolean
  roomId?: string
  socketId?: string
  participants?: VideoParticipant[]
  error?: string
}

type OfferPayload = {
  roomId: string
  from: string
  description: RTCSessionDescriptionInit
}

type IceCandidatePayload = {
  roomId: string
  from: string
  candidate: RTCIceCandidateInit
}

type ParticipantJoinedPayload = {
  roomId: string
  participant: VideoParticipant
}

type ParticipantLeftPayload = {
  roomId: string
  socketId: string
  userId?: string
}

type ParticipantCountPayload = {
  roomId: string
  count: number
}

type ServerToClientEvents = {
  'video:participant-joined': (payload: ParticipantJoinedPayload) => void
  'video:participant-left': (payload: ParticipantLeftPayload) => void
  'video:participant-count': (payload: ParticipantCountPayload) => void
  'video:offer': (payload: OfferPayload) => void
  'video:answer': (payload: OfferPayload) => void
  'video:ice-candidate': (payload: IceCandidatePayload) => void
}

type ClientToServerEvents = {
  'video:join-room': (
    payload: { roomId: string, displayName: string },
    callback: (response: JoinRoomResponse) => void
  ) => void
  'video:leave-room': () => void
  'video:offer': (payload: { to: string, description: RTCSessionDescriptionInit }) => void
  'video:answer': (payload: { to: string, description: RTCSessionDescriptionInit }) => void
  'video:ice-candidate': (payload: { to: string, candidate: RTCIceCandidateInit }) => void
}

type VideoSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const props = withDefaults(defineProps<{
  defaultRoomName?: string
  displayName?: string
  signalingUrl?: string
}>(), {
  defaultRoomName: 'eat-planner-fournisseurs',
  displayName: 'Participant'
})

const emit = defineEmits<{
  leave: []
}>()

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appToast = useAppToast()

const roomInput = ref(getInitialRoomName())
const activeRoomId = ref('')
const localSocketId = ref('')
const joined = ref(false)
const joining = ref(false)
const microphoneEnabled = ref(true)
const cameraEnabled = ref(true)
const participantCount = ref(0)
const errorMessage = ref('')

const socket = shallowRef<VideoSocket | null>(null)
const localVideo = ref<HTMLVideoElement | null>(null)
const localStream = shallowRef<MediaStream | null>(null)
const remoteParticipants = shallowRef<Record<string, RemoteParticipant>>({})

const peers = new Map<string, RTCPeerConnection>()
const remoteStreams = new Map<string, MediaStream>()
const remoteVideoRefs = new Map<string, HTMLVideoElement>()
const pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()

const signalingUrl = computed(() => {
  return props.signalingUrl
    || config.public.realtimeBaseUrl
    || 'http://localhost:3000'
})
const remoteParticipantList = computed(() => Object.values(remoteParticipants.value))
const hasRemoteParticipants = computed(() => remoteParticipantList.value.length > 0)
const visibleParticipantCount = computed(() => joined.value ? Math.max(participantCount.value, 1 + remoteParticipantList.value.length) : 0)
const roomShareUrl = computed(() => {
  if (!import.meta.client) {
    return ''
  }

  const roomId = activeRoomId.value || normalizeRoomName(roomInput.value)
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)

  return url.toString()
})

watch(localVideo, attachLocalStream)

function getInitialRoomName() {
  const routeRoom = Array.isArray(route.query.room) ? route.query.room[0] : route.query.room
  return extractRoomName(routeRoom || props.defaultRoomName)
}

function extractRoomName(value: string) {
  const rawValue = value.trim()

  if (!rawValue) {
    return props.defaultRoomName
  }

  try {
    const url = new URL(rawValue)
    return url.searchParams.get('room') || url.pathname.split('/').filter(Boolean).at(-1) || props.defaultRoomName
  } catch {
    return rawValue
  }
}

function normalizeRoomName(value: string) {
  return extractRoomName(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function attachLocalStream() {
  if (!localVideo.value || !localStream.value) {
    return
  }

  localVideo.value.srcObject = localStream.value
}

function setRemoteVideoRef(socketId: string, element: Element | ComponentPublicInstance | null) {
  const video = element instanceof HTMLVideoElement ? element : null

  if (video) {
    remoteVideoRefs.set(socketId, video)
    attachRemoteStream(socketId)
    return
  }

  remoteVideoRefs.delete(socketId)
}

function attachRemoteStream(socketId: string) {
  const video = remoteVideoRefs.get(socketId)
  const stream = remoteParticipants.value[socketId]?.stream

  if (!video || !stream) {
    return
  }

  video.srcObject = stream
}

function upsertRemoteParticipant(participant: VideoParticipant, changes: Partial<RemoteParticipant> = {}) {
  const current = remoteParticipants.value[participant.socketId]
  const nextParticipant: RemoteParticipant = {
    socketId: participant.socketId,
    userId: participant.userId,
    displayName: participant.displayName,
    stream: current?.stream ?? null,
    connectionState: current?.connectionState ?? 'new',
    ...changes
  }

  if (participant.role) {
    nextParticipant.role = participant.role
  }

  remoteParticipants.value = {
    ...remoteParticipants.value,
    [participant.socketId]: nextParticipant
  }

  void nextTick(() => attachRemoteStream(participant.socketId))
}

function updateRemoteConnectionState(socketId: string, connectionState: RTCPeerConnectionState) {
  const participant = remoteParticipants.value[socketId]

  if (!participant) {
    return
  }

  remoteParticipants.value = {
    ...remoteParticipants.value,
    [socketId]: {
      ...participant,
      connectionState
    }
  }
}

function removeRemoteParticipant(socketId: string) {
  closePeer(socketId)
  remoteStreams.delete(socketId)
  pendingIceCandidates.delete(socketId)
  remoteVideoRefs.delete(socketId)

  remoteParticipants.value = Object.fromEntries(
    Object.entries(remoteParticipants.value).filter(([id]) => id !== socketId)
  )
}

async function prepareLocalStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Ton navigateur ne supporte pas l appel audio/video.')
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })

    localStream.value = markRaw(stream)
    microphoneEnabled.value = stream.getAudioTracks().some(track => track.enabled)
    cameraEnabled.value = stream.getVideoTracks().some(track => track.enabled)
    attachLocalStream()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new Error('Permission camera ou micro refusee.')
    }

    if (error instanceof DOMException && error.name === 'NotFoundError') {
      throw new Error('Aucune camera ou aucun micro detecte.')
    }

    throw error
  }
}

async function joinCall() {
  if (!import.meta.client || joining.value || joined.value) {
    return
  }

  const roomId = normalizeRoomName(roomInput.value)

  if (!roomId) {
    errorMessage.value = 'Entre un ID de room valide.'
    return
  }

  if (!authStore.token) {
    errorMessage.value = 'Reconnecte-toi pour lancer un appel.'
    return
  }

  joining.value = true
  errorMessage.value = ''

  try {
    await prepareLocalStream()

    const { io } = await import('socket.io-client')
    const nextSocket: VideoSocket = io(signalingUrl.value, {
      autoConnect: false,
      transports: ['websocket'],
      auth: {
        token: authStore.token
      },
      withCredentials: true
    })

    socket.value = nextSocket
    bindSocketEvents(nextSocket)
    nextSocket.connect()

    await waitForSocketConnection(nextSocket)

    const response = await joinSocketRoom(nextSocket, roomId)

    if (!response.ok || !response.roomId || !response.socketId) {
      throw new Error(response.error || 'Impossible de rejoindre la room.')
    }

    activeRoomId.value = response.roomId
    localSocketId.value = response.socketId
    joined.value = true
    participantCount.value = 1 + (response.participants?.length ?? 0)
    roomInput.value = response.roomId

    await router.replace({
      query: {
        ...route.query,
        room: response.roomId
      }
    })

    for (const participant of response.participants ?? []) {
      upsertRemoteParticipant(participant)
      await createOfferForParticipant(participant.socketId)
    }

    appToast.success('Appel lance', `Room ${response.roomId}`)
  } catch (error) {
    errorMessage.value = getErrorText(error, 'Impossible de rejoindre l appel.')
    appToast.error('Visio indisponible', errorMessage.value)
    cleanupCall()
  } finally {
    joining.value = false
  }
}

function bindSocketEvents(currentSocket: VideoSocket) {
  currentSocket.on('video:participant-joined', (payload) => {
    if (payload.participant.socketId === localSocketId.value) {
      return
    }

    upsertRemoteParticipant(payload.participant)
    appToast.info('Participant connecte', payload.participant.displayName)
  })

  currentSocket.on('video:participant-left', (payload) => {
    removeRemoteParticipant(payload.socketId)
    participantCount.value = Math.max(1, participantCount.value - 1)
  })

  currentSocket.on('video:participant-count', (payload) => {
    if (payload.roomId === activeRoomId.value || !activeRoomId.value) {
      participantCount.value = payload.count
    }
  })

  currentSocket.on('video:offer', (payload) => {
    void handleRemoteOffer(payload)
  })

  currentSocket.on('video:answer', (payload) => {
    void handleRemoteAnswer(payload)
  })

  currentSocket.on('video:ice-candidate', (payload) => {
    void handleRemoteIceCandidate(payload)
  })

  currentSocket.on('connect_error', (error) => {
    errorMessage.value = error.message || 'Connexion temps reel impossible.'
  })
}

function waitForSocketConnection(currentSocket: VideoSocket) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Connexion au serveur temps reel trop longue.'))
    }, 8000)

    currentSocket.once('connect', () => {
      window.clearTimeout(timeout)
      resolve()
    })

    currentSocket.once('connect_error', (error) => {
      window.clearTimeout(timeout)
      reject(error)
    })
  })
}

function joinSocketRoom(currentSocket: VideoSocket, roomId: string) {
  return new Promise<JoinRoomResponse>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('La room ne repond pas.'))
    }, 8000)

    currentSocket.emit('video:join-room', {
      roomId,
      displayName: props.displayName || 'Participant'
    }, (response) => {
      window.clearTimeout(timeout)
      resolve(response)
    })
  })
}

function createPeerConnection(socketId: string) {
  const existingPeer = peers.get(socketId)

  if (existingPeer) {
    return existingPeer
  }

  // =========================================================================
  // PASSAGE EN PRODUCTION (VPS) — checklist pour la visio
  // -------------------------------------------------------------------------
  // En local, un serveur STUN seul suffit car les deux navigateurs sont sur le
  // meme reseau/NAT. Sur Internet, ce n est PAS suffisant. Avant de deployer :
  //
  //  1. HTTPS OBLIGATOIRE. getUserMedia() (camera/micro) est bloque par les
  //     navigateurs hors "secure context". Sers le site en https:// derriere
  //     un reverse proxy (Caddy, Traefik ou Nginx) avec un certificat TLS.
  //
  //  2. SERVEUR TURN. Derriere des NAT stricts / firewalls d entreprise, la
  //     connexion peer-to-peer directe echoue. Il faut un serveur TURN (ex:
  //     coturn) qui relaie le flux. Renseigne alors, cote frontend :
  //         NUXT_PUBLIC_TURN_URL=turn:turn.mondomaine.com:3478
  //         NUXT_PUBLIC_TURN_USERNAME=...
  //         NUXT_PUBLIC_TURN_CREDENTIAL=...
  //     Le STUN seul ne relaie rien : sans TURN, certains appels ne passeront
  //     jamais.
  //
  //  3. URL DE SIGNALING. NUXT_PUBLIC_REALTIME_BASE_URL doit pointer vers l URL
  //     PUBLIQUE HTTPS du backend (ex: https://api.mondomaine.com), pas
  //     localhost. socket.io basculera tout seul en wss://.
  //
  //  4. CORS. Ajoute ton domaine de prod dans CORS_ORIGIN cote backend
  //     (voir getAllowedOrigins() dans backend/src/realtime/videoSignaling.ts).
  // =========================================================================
  const iceServers: RTCIceServer[] = [
    { urls: config.public.stunUrl || 'stun:stun.l.google.com:19302' }
  ]

  // TURN uniquement s il est configure (indispensable en prod, cf. point 2).
  if (config.public.turnUrl) {
    iceServers.push({
      urls: config.public.turnUrl,
      username: config.public.turnUsername,
      credential: config.public.turnCredential
    })
  }

  const peer = new RTCPeerConnection({ iceServers })

  localStream.value?.getTracks().forEach((track) => {
    if (localStream.value) {
      peer.addTrack(track, localStream.value)
    }
  })

  peer.onicecandidate = (event) => {
    if (!event.candidate) {
      return
    }

    socket.value?.emit('video:ice-candidate', {
      to: socketId,
      candidate: event.candidate.toJSON()
    })
  }

  peer.ontrack = (event) => {
    const stream = event.streams[0] ?? remoteStreams.get(socketId) ?? new MediaStream()

    if (!event.streams[0] && !stream.getTrackById(event.track.id)) {
      stream.addTrack(event.track)
    }

    remoteStreams.set(socketId, markRaw(stream))

    const participant = remoteParticipants.value[socketId]
    if (participant) {
      upsertRemoteParticipant(participant, { stream: markRaw(stream) })
    }
  }

  peer.onconnectionstatechange = () => {
    updateRemoteConnectionState(socketId, peer.connectionState)

    if (peer.connectionState === 'failed') {
      void peer.restartIce()
    }
  }

  peers.set(socketId, peer)
  return peer
}

async function createOfferForParticipant(socketId: string) {
  const peer = createPeerConnection(socketId)
  const offer = await peer.createOffer()

  await peer.setLocalDescription(offer)
  socket.value?.emit('video:offer', {
    to: socketId,
    description: offer
  })
}

async function handleRemoteOffer(payload: OfferPayload) {
  const peer = createPeerConnection(payload.from)

  await peer.setRemoteDescription(payload.description)
  await flushPendingIceCandidates(payload.from, peer)

  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)

  socket.value?.emit('video:answer', {
    to: payload.from,
    description: answer
  })
}

async function handleRemoteAnswer(payload: OfferPayload) {
  const peer = peers.get(payload.from)

  if (!peer) {
    return
  }

  await peer.setRemoteDescription(payload.description)
  await flushPendingIceCandidates(payload.from, peer)
}

async function handleRemoteIceCandidate(payload: IceCandidatePayload) {
  const peer = peers.get(payload.from)

  if (!peer || !peer.remoteDescription) {
    const queuedCandidates = pendingIceCandidates.get(payload.from) ?? []
    queuedCandidates.push(payload.candidate)
    pendingIceCandidates.set(payload.from, queuedCandidates)
    return
  }

  await peer.addIceCandidate(payload.candidate)
}

async function flushPendingIceCandidates(socketId: string, peer: RTCPeerConnection) {
  const queuedCandidates = pendingIceCandidates.get(socketId) ?? []

  for (const candidate of queuedCandidates) {
    await peer.addIceCandidate(candidate)
  }

  pendingIceCandidates.delete(socketId)
}

function closePeer(socketId: string) {
  peers.get(socketId)?.close()
  peers.delete(socketId)
}

function toggleMicrophone() {
  const nextValue = !microphoneEnabled.value
  localStream.value?.getAudioTracks().forEach((track) => {
    track.enabled = nextValue
  })
  microphoneEnabled.value = nextValue
}

function toggleCamera() {
  const nextValue = !cameraEnabled.value
  localStream.value?.getVideoTracks().forEach((track) => {
    track.enabled = nextValue
  })
  cameraEnabled.value = nextValue
}

async function copyRoomLink() {
  if (!roomShareUrl.value) {
    return
  }

  await navigator.clipboard.writeText(roomShareUrl.value)
  appToast.success('Lien copie', 'Tu peux le partager avec le fournisseur.')
}

function cleanupCall() {
  socket.value?.emit('video:leave-room')
  socket.value?.disconnect()
  socket.value = null

  peers.forEach(peer => peer.close())
  peers.clear()
  remoteStreams.clear()
  remoteVideoRefs.clear()
  pendingIceCandidates.clear()
  remoteParticipants.value = {}

  localStream.value?.getTracks().forEach(track => track.stop())
  localStream.value = null

  joined.value = false
  joining.value = false
  activeRoomId.value = ''
  localSocketId.value = ''
  participantCount.value = 0
  microphoneEnabled.value = true
  cameraEnabled.value = true
}

function leaveCall() {
  cleanupCall()
  emit('leave')
}

onBeforeUnmount(() => {
  cleanupCall()
})
</script>

<template>
  <section class="app-section space-y-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <span class="app-eyebrow">Appel direct</span>
        <h2 class="app-section-title">
          Visio fournisseur
        </h2>
        <p class="app-muted mt-1">
          Partage la room avec ton fournisseur pour demarrer l appel.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="app-pill">
          <UIcon
            name="i-lucide-users"
            class="size-3.5"
          />
          {{ visibleParticipantCount }} participant(s)
        </span>
        <span
          class="app-pill"
          :class="joined ? 'text-success' : 'text-warning'"
        >
          {{ joined ? 'Connecte' : 'Hors appel' }}
        </span>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
      <label class="block space-y-1.5">
        <span class="text-sm font-bold text-[#1a1c1c] dark:text-white">Room</span>
        <input
          v-model="roomInput"
          class="app-input"
          :disabled="joined || joining"
          placeholder="eat-planner-fournisseurs"
        >
      </label>

      <div class="flex items-end gap-2">
        <button
          v-if="!joined"
          type="button"
          class="btn-primary min-w-32"
          :disabled="joining"
          @click="joinCall"
        >
          <UIcon
            name="i-lucide-video"
            class="size-4"
          />
          {{ joining ? 'Connexion...' : 'Rejoindre' }}
        </button>

        <button
          v-else
          type="button"
          class="btn-secondary min-w-32"
          @click="copyRoomLink"
        >
          <UIcon
            name="i-lucide-link"
            class="size-4"
          />
          Copier
        </button>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="app-alert-error"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="mt-0.5 size-4 shrink-0"
      />
      <span>{{ errorMessage }}</span>
    </p>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article class="overflow-hidden rounded-xl border border-[#c0c9ba]/20 bg-[#111312] text-white dark:border-white/10">
        <div class="relative aspect-video bg-black">
          <video
            ref="localVideo"
            autoplay
            muted
            playsinline
            class="h-full w-full object-cover"
            :class="cameraEnabled ? '' : 'opacity-0'"
          />

          <div
            v-if="!cameraEnabled || !localStream"
            class="absolute inset-0 flex items-center justify-center bg-[#1a1c1c]"
          >
            <UIcon
              name="i-lucide-video-off"
              class="size-8 text-white/70"
            />
          </div>

          <div class="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-md bg-black/65 px-2 py-1 text-xs font-bold">
            <span class="truncate">{{ displayName || 'Moi' }}</span>
            <UIcon
              :name="microphoneEnabled ? 'i-lucide-mic' : 'i-lucide-mic-off'"
              class="size-3.5"
            />
          </div>
        </div>
      </article>

      <article
        v-for="participant in remoteParticipantList"
        :key="participant.socketId"
        class="overflow-hidden rounded-xl border border-[#c0c9ba]/20 bg-[#111312] text-white dark:border-white/10"
      >
        <div class="relative aspect-video bg-black">
          <video
            :ref="element => setRemoteVideoRef(participant.socketId, element)"
            autoplay
            playsinline
            class="h-full w-full object-cover"
          />

          <div
            v-if="!participant.stream"
            class="absolute inset-0 flex items-center justify-center bg-[#1a1c1c]"
          >
            <div class="text-center">
              <UIcon
                name="i-lucide-loader-circle"
                class="mx-auto size-7 animate-spin text-white/70"
              />
              <p class="mt-2 text-xs font-bold text-white/70">
                Connexion...
              </p>
            </div>
          </div>

          <div class="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-md bg-black/65 px-2 py-1 text-xs font-bold">
            <span class="truncate">{{ participant.displayName }}</span>
            <span class="text-white/60">{{ participant.connectionState }}</span>
          </div>
        </div>
      </article>

      <article
        v-if="joined && !hasRemoteParticipants"
        class="flex aspect-video items-center justify-center rounded-xl border border-dashed border-[#c0c9ba]/40 bg-[#f3f3f3] p-6 text-center dark:border-white/10 dark:bg-[#2f3131]"
      >
        <div>
          <UIcon
            name="i-lucide-user-plus"
            class="mx-auto size-8 text-[#005013] dark:text-[#8ad986]"
          />
          <p class="mt-3 text-sm font-bold text-[#1a1c1c] dark:text-white">
            En attente du fournisseur
          </p>
          <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
            Meme room : {{ activeRoomId }}
          </p>
        </div>
      </article>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2 border-t border-[#c0c9ba]/20 pt-4 dark:border-white/10">
      <button
        type="button"
        class="btn-secondary"
        :disabled="!joined"
        @click="toggleMicrophone"
      >
        <UIcon
          :name="microphoneEnabled ? 'i-lucide-mic' : 'i-lucide-mic-off'"
          class="size-4"
        />
        {{ microphoneEnabled ? 'Couper micro' : 'Activer micro' }}
      </button>

      <button
        type="button"
        class="btn-secondary"
        :disabled="!joined"
        @click="toggleCamera"
      >
        <UIcon
          :name="cameraEnabled ? 'i-lucide-video' : 'i-lucide-video-off'"
          class="size-4"
        />
        {{ cameraEnabled ? 'Couper camera' : 'Activer camera' }}
      </button>

      <button
        type="button"
        class="btn-danger"
        :disabled="!joined && !joining"
        @click="leaveCall"
      >
        <UIcon
          name="i-lucide-phone-off"
          class="size-4"
        />
        Quitter
      </button>
    </div>
  </section>
</template>
