import "./globals.css";
import NavBar from "@/components/NavBar";

// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-gray-100 text-gray-900">
        <NavBar />
        <main className="p-6 bg-gray-100">{children}</main>
      </body>
    </html>
  );
}
