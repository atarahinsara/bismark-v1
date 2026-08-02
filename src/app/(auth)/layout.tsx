import { Toaster as SonnerToaster } from "sonner"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      {children}
      <SonnerToaster position="top-center" richColors closeButton />
    </div>
  )
}
