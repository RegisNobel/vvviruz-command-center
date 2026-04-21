export default function AdminAuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#0b0d10] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
