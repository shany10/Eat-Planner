import { getFetchErrorMessage } from "~/utils/fetch-error";
import { useAuthStore } from "~/stores/auth";
import { useDishStore } from "~/stores/dishes";
import { useIngredientStore } from "~/stores/ingredients";

export function useDishPage() {
  const authStore = useAuthStore();
  const dishStore = useDishStore();
  const ingredientStore = useIngredientStore();
  const appToast = useAppToast();

  const loading = ref(true);
  const errorMessage = ref("");

  async function loadPage() {
    loading.value = true;
    errorMessage.value = "";
    try {
      const results = await Promise.allSettled([
        authStore.loadProfile(),
        dishStore.load(),
        ingredientStore.load(),
      ]);

      const firstFailure = results.find(
        (result) => result.status === "rejected",
      );

      if (firstFailure?.status === "rejected") {
        errorMessage.value = getFetchErrorMessage(
          firstFailure.reason,
          "Impossible de charger tous les elements des plats",
        );
        appToast.error("Chargement partiel", errorMessage.value);
      }
    } catch (error) {
      errorMessage.value = getFetchErrorMessage(
        error,
        "Impossible de charger les plats",
      );
      appToast.error("Chargement impossible", errorMessage.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    authStore,
    dishStore,
    ingredientStore,
    appToast,
    loading,
    errorMessage,
    loadPage,
  };
}
