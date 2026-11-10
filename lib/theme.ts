export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "nar.theme";
export const SPLASH_KEY = "nar.splash";
/** Minimum time the splash stays up (ms from navigation start), so it reads as intentional rather than a flicker. */
export const SPLASH_MIN_MS = 1400;

/**
 * Runs in <head> before first paint:
 * - applies a saved light/dark choice so the page never flashes the wrong colours
 * - shows the splash screen only on the first load of a browser session
 */
export const themeInitScript = `try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}
try{if(sessionStorage.getItem("${SPLASH_KEY}"))document.documentElement.classList.add("no-splash");else sessionStorage.setItem("${SPLASH_KEY}","1")}catch(e){}`;

/** Runs at the end of <body>: fades the splash out once the page has loaded (and the minimum time has passed). */
export const splashHideScript = `(function(){var d=document.documentElement;if(d.classList.contains("no-splash"))return;
var min=matchMedia("(prefers-reduced-motion: reduce)").matches?300:${SPLASH_MIN_MS};
function hide(){setTimeout(function(){d.classList.add("splash-out");setTimeout(function(){d.classList.add("no-splash")},600)},Math.max(0,min-performance.now()))}
if(document.readyState==="complete")hide();else addEventListener("load",hide);
setTimeout(function(){d.classList.add("no-splash")},6000)})();`;
