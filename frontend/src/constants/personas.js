import { Buildings, Package, Motorcycle, ShieldStar } from "@phosphor-icons/react";

export const PERSONAS = {
  business: {
    id: "business",
    label: "Business / Fleet Owner",
    shortLabel: "Business",
    loginPath: "/login/business",
    registerPath: "/register/business",
    postLogin: "/app/dashboard",
    allowedRoles: ["org_owner", "ops_manager", "dispatcher"],
    wrongRoleHint: "Try the customer or driver login instead.",
    accent: "#002FA7",
    hero: {
      tag: "01 — Fleet operations",
      title: "Run your fleet\nwith precision.",
      highlight: "Deliver with proof.",
      body: "Dispatch drivers, track vehicles, and manage deliveries from one control room.",
    },
    register: {
      title: "Create your workspace",
      subtitle: "14-day free trial. No card required.",
      cta: "Create workspace",
    },
  },
  customer: {
    id: "customer",
    label: "Individual Customer",
    shortLabel: "Customer",
    loginPath: "/login/customer",
    registerPath: "/register/customer",
    postLogin: "/send-parcel",
    allowedRoles: ["customer", "individual_customer"],
    wrongRoleHint: "Try the business or driver login instead.",
    accent: "#059669",
    hero: {
      tag: "02 — Send parcels",
      title: "Ship in minutes,\nnot hours.",
      highlight: "Track every step.",
      body: "Book on-demand deliveries, track in real time, and pay only for what you send.",
    },
    register: {
      title: "Create your account",
      subtitle: "Send parcels in minutes",
      cta: "Create account",
    },
  },
  driver: {
    id: "driver",
    label: "Delivery Partner",
    shortLabel: "Driver",
    loginPath: "/login/driver",
    registerPath: "/register/driver",
    postLogin: "/partner/onboarding",
    postLoginApproved: "/driver/jobs",
    allowedRoles: ["driver"],
    wrongRoleHint: "Try the business or customer login instead.",
    accent: "#D97706",
    hero: {
      tag: "03 — Earn on your route",
      title: "Accept jobs.\nDeliver. Earn.",
      highlight: "On your schedule.",
      body: "Complete verification, accept nearby offers, and get paid for every drop.",
    },
    register: {
      title: "Join as a delivery partner",
      subtitle: "Verify once, then accept delivery offers",
      cta: "Start application",
    },
  },
  admin: {
    id: "admin",
    label: "Platform Admin",
    shortLabel: "Admin",
    loginPath: "/admin/login",
    postLogin: "/admin",
    allowedRoles: ["super_admin"],
    wrongRoleHint: "This portal is for platform administrators only.",
    accent: "#0A0A0A",
    hero: {
      tag: "Platform control",
      title: "FleetGrid\nAdministration",
      highlight: "Secure access.",
      body: "Manage organizations, partners, subscriptions, and platform analytics.",
    },
  },
};

export const JOURNEYS = [
  {
    persona: "business",
    Icon: Buildings,
    title: "Businesses & Fleet Owners",
    description: "Run dispatch, fleet, drivers, and proof-of-delivery at scale.",
    cta: "Start free trial",
    login: "Sign in",
  },
  {
    persona: "customer",
    Icon: Package,
    title: "Individual Customers",
    description: "Send parcels on demand — no fleet account required.",
    cta: "Create account",
    login: "Sign in",
  },
  {
    persona: "driver",
    Icon: Motorcycle,
    title: "Delivery Partners",
    description: "Verify your profile, accept offers, and earn per delivery.",
    cta: "Apply to drive",
    login: "Partner sign in",
  },
];

export const ADMIN_LINK = { Icon: ShieldStar, path: "/admin/login", label: "Platform admin" };

export function matchesPersona(user, personaId) {
  if (!user?.roles) return false;
  const p = PERSONAS[personaId];
  if (!p?.allowedRoles) return false;
  if (user.roles.includes("super_admin")) return personaId === "admin";
  return user.roles.some((r) => p.allowedRoles.includes(r));
}

export function resolvePostLogin(user, personaId) {
  if (personaId === "driver" && user.roles.includes("driver")) {
    return PERSONAS.driver.postLoginApproved || "/driver/jobs";
  }
  if (personaId === "customer" && user.roles.includes("customer")) {
    return user.roles.includes("individual_customer") ? "/send-parcel" : "/portal";
  }
  if (personaId === "business") {
    const roles = user.roles;
    if (roles.includes("org_owner") || roles.includes("ops_manager") || roles.includes("dispatcher")) {
      return "/app/dashboard";
    }
  }
  if (personaId === "admin" && user.roles.includes("super_admin")) return "/admin";
  return PERSONAS[personaId]?.postLogin || "/home";
}
