import {NextResponse, type NextRequest} from "next/server";

type MiddlewareCookiePayload = {
  sid: string;
  stage: "setup-totp" | "pending-totp" | "authenticated";
  exp: number;
  v: 1;
};

const ADMIN_COOKIE = "vvv_admin_session";
const encoder = new TextEncoder();

function base64UrlToBase64(value: string) {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");

  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

function decodePayload(encodedPayload: string) {
  try {
    const payload = JSON.parse(atob(base64UrlToBase64(encodedPayload))) as MiddlewareCookiePayload;

    if (
      payload.v !== 1 ||
      !payload.sid ||
      !payload.stage ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifySessionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret || secret.length < 32) {
    return null;
  }

  const scopeKey = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${secret}:session-cookie`)
  );
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    scopeKey,
    {name: "HMAC", hash: "SHA-256"},
    false,
    ["sign"]
  );
  const expectedSignature = bytesToBase64Url(
    new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(encodedPayload)))
  );

  if (expectedSignature !== signature) {
    return null;
  }

  return decodePayload(encodedPayload);
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifySessionCookie(cookie);
  const stage = session?.stage ?? null;

  if (pathname === "/admin/login") {
    if (stage === "authenticated") {
      return redirectTo(request, "/admin");
    }

    if (stage === "pending-totp") {
      return redirectTo(request, "/admin/2fa");
    }

    if (stage === "setup-totp") {
      return redirectTo(request, "/admin/setup-2fa");
    }

    return NextResponse.next();
  }

  if (pathname === "/admin/2fa") {
    if (stage === "authenticated") {
      return redirectTo(request, "/admin");
    }

    if (stage === "setup-totp") {
      return redirectTo(request, "/admin/setup-2fa");
    }

    if (stage !== "pending-totp") {
      return redirectTo(request, "/admin/login");
    }

    return NextResponse.next();
  }

  if (pathname === "/admin/setup-2fa") {
    if (stage === "authenticated") {
      return redirectTo(request, "/admin");
    }

    if (stage === "pending-totp") {
      return redirectTo(request, "/admin/2fa");
    }

    if (stage !== "setup-totp") {
      return redirectTo(request, "/admin/login");
    }

    return NextResponse.next();
  }

  if (pathname === "/admin/logout") {
    return NextResponse.next();
  }

  if (stage === "authenticated") {
    return NextResponse.next();
  }

  if (stage === "pending-totp") {
    return redirectTo(request, "/admin/2fa");
  }

  if (stage === "setup-totp") {
    return redirectTo(request, "/admin/setup-2fa");
  }

  return redirectTo(request, "/admin/login");
}

export const config = {
  matcher: ["/admin/:path*"]
};
