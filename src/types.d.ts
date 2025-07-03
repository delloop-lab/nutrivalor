declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare global {
  interface Window {
    showSection: (sectionId: string) => void;
    showUploadModal: () => void;
    closeUploadModal: () => void;
    updateProfile: () => Promise<void>;
    loadProfile: () => Promise<void>;
    removeAvatar: () => void;
    exportData: () => void;
    clearAllData: () => void;
    reloadMeals: () => Promise<void>;
    clearShoppingList: () => void;
    formatText: (command: string) => void;
    formatEditText: (command: string) => void;
    removeMealPicture: () => void;
    removeEditMealPicture: () => void;
    setupMealPictureEventListeners: () => void;
  }
} 