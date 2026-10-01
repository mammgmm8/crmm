import {hasLocale} from "next-intl";
import {NextResponse, type NextRequest} from "next/server";
import {routing} from "@/i18n/routing";
import {createClient} from "@/lib/supabase/server";

export async function GET(request: NextRequest, {params}: {params: Promise<{locale: string}>}) {
  const {locale: requestedLocale} = await params;
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
  }

  return NextResponse.redirect(new URL(`/${locale}?error=auth`, request.url));
}