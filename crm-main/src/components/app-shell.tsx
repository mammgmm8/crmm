import Link from "next/link";
import Image from "next/image";
import {getTranslations} from "next-intl/server";
import {signOut, markNotificationRead} from "@/app/[locale]/actions";
import type {Locale} from "@/i18n/routing";
import type {NotificationRow, OrganizationRow, OrganizationRole} from "@/lib/supabase/database";
import {Icon} from "@/components/ui/icon";
import {Motion} from "@/components/ui/motion";

type AppPage = "overview" | "new-lead" | "settings";

export async function AppShell({
  children,
  locale,
  page,
  organization,
  role,
  userEmail,
  notifications = [],
  leadCount = 0,
  todayTaskCount = 0,
}: {
  children: React.ReactNode;
  locale: Locale;
  page: AppPage;
  organization: OrganizationRow;
  role: OrganizationRole;
  userEmail: string;
  notifications?: NotificationRow[];
  leadCount?: number;
  todayTaskCount?: number;
}) {
  const [t, orgT] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("organization"),
  ]);
  const routeSuffix = page === "settings"
    ? "/settings"
    : page === "new-lead"
      ? "/dashboard/new-lead"
      : "/dashboard";
  const alternateLocale: Locale = locale === "ar" ? "en" : "ar";
  const numberFormat = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <main className="workspace-shell">
      <aside aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"} className="workspace-sidebar">
        <Link className="brand-lockup sidebar-brand" href={`/${locale}/dashboard`}>
          <Image alt={locale === "ar" ? "مسار" : "Masar"} height={44} src="/brand/masar-logo.svg" width={118} />
        </Link>
        <div className="org-switcher">
          <span className="org-avatar"><Icon name="company" size={18} /></span>
          <span className="org-name-wrap"><strong>{organization.name}</strong><small>{orgT(role)}</small></span>
          <Icon className="icon-flip org-chevron" name="arrow-end" size={16} />
        </div>
        <p className="nav-caption">{t(role === "sales" ? "today" : "overview")}</p>
        <nav aria-label={locale === "ar" ? "أقسام مساحة العمل" : "Workspace sections"} className="main-nav">
          <Link aria-current={page === "overview" ? "page" : undefined} className={`nav-item${page === "overview" ? " nav-item-active" : ""}`} href={`/${locale}/dashboard`}><Icon name={role === "sales" ? "calendar" : "dashboard"} size={18} />{t(role === "sales" ? "today" : "overview")}</Link>
          {role === "sales" && <Link className="nav-item" href={`/${locale}/dashboard#whatsapp-queue`}><Icon name="whatsapp-queue" size={18} />{t("whatsappQueue")}</Link>}
          <Link aria-current={page === "new-lead" ? "page" : undefined} className={`nav-item${page === "new-lead" ? " nav-item-active" : ""}`} href={`/${locale}/dashboard#leads`}><Icon name="leads" size={18} />{t("leads")}<span className="nav-count">{numberFormat.format(leadCount)}</span></Link>
          <Link className="nav-item" href={`/${locale}/dashboard#tasks`}><Icon name="tasks" size={18} />{t("tasks")}<span className="nav-count">{numberFormat.format(todayTaskCount)}</span></Link>
          {(role === "owner" || role === "manager") && <Link className="nav-item" href={`/${locale}/dashboard#pipeline`}><Icon name="reports" size={18} />{t("pipeline")}</Link>}
        </nav>
          {(role === "owner" || role === "manager") && (
            <Link aria-current={page === "settings" ? "page" : undefined} className={`nav-item${page === "settings" ? " nav-item-active" : ""}`} href={`/${locale}/settings`}><Icon name="settings" size={18} />{orgT("settings")}</Link>
          )}
        <div className="sidebar-bottom">
          <div className="timezone-note"><Icon name="calendar" size={16} /><span>{organization.timezone}</span></div>
          <form action={signOut.bind(null, locale)}>
            <button className="nav-item sign-out-button" type="submit"><Icon className="icon-flip" name="logout" size={18} />{t("signOut")}</button>
          </form>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div className="breadcrumb"><span>{organization.name}</span><Icon className="icon-flip" name="arrow-end" size={14} /><strong>{page === "settings" ? orgT("settings") : page === "new-lead" ? t("leads") : t(role === "sales" ? "today" : "overview")}</strong></div>
          <div className="topbar-actions">
            <Link aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"} className="locale-switch topbar-locale" href={`/${alternateLocale}${routeSuffix}`} hrefLang={alternateLocale}>{locale === "ar" ? "EN" : "ع"}</Link>
            <details className="notification-menu">
              <summary aria-label={locale === "ar" ? "التنبيهات" : "Notifications"} className="icon-button touch-target" title={locale === "ar" ? "التنبيهات" : "Notifications"}>
                <Icon name="notifications" size={20} />
                {notifications.length > 0 && <span className="notification-count">{numberFormat.format(notifications.length)}</span>}
              </summary>
              <div className="notification-popover">
                <strong>{t("reminderTitle")}</strong>
                {notifications.map((notification) => (
                  <div className="notification-item" key={notification.id}>
                    <span>{locale === "ar" ? notification.title_ar : notification.title}</span>
                    <form action={markNotificationRead.bind(null, organization.id, notification.id, locale)}>
                      <button aria-label={locale === "ar" ? "تعليم كمقروء" : "Mark as read"} className="notification-dismiss touch-target" type="submit"><Icon name="check" size={17} /></button>
                    </form>
                  </div>
                ))}
                {notifications.length === 0 && <p className="empty-inline">{t("reminderEmpty")}</p>}
              </div>
            </details>
            <span aria-label={userEmail} className="user-avatar">{(userEmail[0] ?? "U").toUpperCase()}</span>
          </div>
        </header>
        <Motion>{children}</Motion>
      </section>
    </main>
  );
}