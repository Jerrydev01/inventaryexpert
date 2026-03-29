"use client";

import Link from "next/link";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useModule } from "@/lib/module-context";
import {
  Analytics01Icon,
  ChartHistogramIcon,
  CommandIcon,
  DashboardSquare01Icon,
  File01Icon,
  Folder01Icon,
  HelpCircleIcon,
  Menu01Icon,
  SearchIcon,
  Settings05Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />,
    },
    {
      title: "Search",
      url: "#",
      icon: <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />,
    },
  ],
};

type SidebarUser = {
  name: string;
  email: string;
  avatar?: string;
};

function iconFromNavKey(icon?: string): React.ReactNode {
  const className = "size-4";

  switch (icon) {
    case "home":
      return (
        <HugeiconsIcon
          icon={DashboardSquare01Icon}
          strokeWidth={2}
          className={className}
        />
      );
    case "box":
    case "shopping-bag":
      return (
        <HugeiconsIcon
          icon={Folder01Icon}
          strokeWidth={2}
          className={className}
        />
      );
    case "building":
    case "store":
    case "map":
    case "map-pin":
      return (
        <HugeiconsIcon
          icon={UserGroupIcon}
          strokeWidth={2}
          className={className}
        />
      );
    case "leaf":
      return (
        <HugeiconsIcon
          icon={Analytics01Icon}
          strokeWidth={2}
          className={className}
        />
      );
    case "arrow-down":
      return (
        <HugeiconsIcon
          icon={Menu01Icon}
          strokeWidth={2}
          className={className}
        />
      );
    case "arrow-up":
    case "arrows":
      return (
        <HugeiconsIcon
          icon={ChartHistogramIcon}
          strokeWidth={2}
          className={className}
        />
      );
    case "list":
      return (
        <HugeiconsIcon
          icon={File01Icon}
          strokeWidth={2}
          className={className}
        />
      );
    default:
      return (
        <HugeiconsIcon
          icon={Menu01Icon}
          strokeWidth={2}
          className={className}
        />
      );
  }
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser }) {
  const module = useModule();

  const navMain = module.nav.map((item) => ({
    title: item.label,
    url: item.href,
    icon: iconFromNavKey(item.icon),
  }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <HugeiconsIcon
                icon={CommandIcon}
                strokeWidth={2}
                className="size-5!"
              />
              <span className="text-base font-semibold">
                {module.displayName}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
