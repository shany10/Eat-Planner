import { getFetchErrorMessage } from "~/utils/fetch-error";
import type { Dish } from "~/types/business";
import type { DishPayload } from "~/types/dishe";
import { useDishStore } from "~/stores/dishes";

export function useDishActions(errorMessage: Ref<string>) {
  const dishStore = useDishStore();
  const appToast = useAppToast();

  const editingDish = ref<Dish | null>(null);
  const dishModalOpen = ref(false);

  async function saveDish(payload: DishPayload) {
    try {
      if (editingDish.value) {
        await dishStore.update(editingDish.value._id, payload);
        appToast.success("Plat mis a jour", `${payload.name} a ete modifie.`);
      } else {
        await dishStore.create(payload);
        appToast.success(
          "Plat ajoute",
          `${payload.name} est maintenant dans la carte.`,
        );
      }
      closeDishModal();
    } catch (error) {
      errorMessage.value = getFetchErrorMessage(
        error,
        "Echec lors de l enregistrement du plat",
      );
      appToast.error("Enregistrement impossible", errorMessage.value);
    }
  }

  async function removeDish(item: Dish) {
    try {
      await dishStore.remove(item._id);
      appToast.success(
        "Plat supprime",
        `${item.name} a ete retire de la carte.`,
      );
    } catch (error) {
      errorMessage.value = getFetchErrorMessage(error, "Suppression impossible");
      appToast.error("Suppression impossible", errorMessage.value);
    }
  }

  function openDishModal() {
    editingDish.value = null;
    dishModalOpen.value = true;
  }

  function editDish(item: Dish) {
    editingDish.value = item;
    dishModalOpen.value = true;
  }

  function closeDishModal() {
    dishModalOpen.value = false;
    editingDish.value = null;
  }

  return {
    editingDish,
    dishModalOpen,
    saveDish,
    removeDish,
    openDishModal,
    editDish,
    closeDishModal,
  };
}
