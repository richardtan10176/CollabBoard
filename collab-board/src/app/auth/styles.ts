// src/app/auth/styles.ts
export const styles = {
  // Layout
  container:
    "min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center p-4",
  card:
    "w-full max-w-md bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl ring-1 ring-white/10 p-6 md:p-8",

  // Header
  headerTitle: "text-2xl font-semibold tracking-tight",
  headerSubtle: "text-slate-400 mt-1 text-sm",
  link: "text-indigo-400 hover:text-indigo-300 underline",

  // Messages
  error:
    "mb-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 px-3 py-2 text-sm",

  // Inputs
  label: "block text-sm mb-1 text-slate-300",
  input:
    "w-full rounded-lg bg-slate-800/70 border border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 outline-none px-3 py-2",

  // Buttons
  btnBase:
    "w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed",
  btnPrimary: "bg-indigo-500 hover:bg-indigo-400",
  btnOAuth:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/40 px-3 py-2.5 text-sm disabled:opacity-60 w-full",
  btnDev: "bg-emerald-500 hover:bg-emerald-400",

  // Divider
  dividerWrap: "relative my-6",
  dividerLine: "absolute inset-0 flex items-center",
  dividerHr: "w-full border-t border-slate-700",
  dividerTextWrap: "relative flex justify-center",
  dividerText: "bg-slate-900/60 px-2 text-xs text-slate-400",
};
