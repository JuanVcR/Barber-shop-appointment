import { store } from "../config/data/store.js";
import type { BarbershopSettings } from "../types.js"; 

export const BarbershopService = {
  list() {
    return store.getBarbershops();
  },

  getById(id: string) {
    return store.getBarbershopById(id);
  },

  save(settings: BarbershopSettings) {
    return store.saveBarbershop(settings);
  }
};