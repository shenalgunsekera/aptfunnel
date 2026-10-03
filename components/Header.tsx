"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="ThatPokerAgent home">
          <Image src="/logo.png" alt="" width={32} height={32} priority />
          <span>THATPOKERAGENT</span>
        </Link>
        {isAdmin ? (
          <span className="eyebrow">Admin</span>
        ) : (
          <nav className="nav" aria-label="Meeting type">
            <Link href="/" aria-current={path === "/" ? "page" : undefined}>
              Voice call
            </Link>
            {/* Text chat hidden from the menu for now; /text still works directly
            <Link href="/text" aria-current={path === "/text" ? "page" : undefined}>
              Text chat
            </Link> */}
          </nav>
        )}
      </div>
    </header>
  );
}
