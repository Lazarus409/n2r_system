export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "nar.theme";

/** Runs in <head> before first paint so a saved theme never flashes the wrong colours. */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
