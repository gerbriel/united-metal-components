import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="flex items-center mb-8">
        <img
          src="/logo/UMC-logo-horizontal.svg"
          alt="United Metal Components"
          className="h-12 w-auto"
        />
      </Link>
      {children}
    </div>
  )
}
