import type {Metadata} from "next";

export const metadata: Metadata = {
  title: {
    default: "vvviruz' command center admin",
    template: "%s | vvviruz admin"
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
