import { Search, LayoutGrid, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Badge } from "@/components/ui/badge";

const BottomNav = () => {
  const { totalUnread } = useUnreadCounts();
  
  console.log("🔔 [BottomNav] Total unread for badge:", totalUnread);
  
  const tabs = [
    {
      name: "Search",
      path: "/home",
      icon: Search,
    },
    {
      name: "Lineup",
      path: "/lineup",
      icon: LayoutGrid,
    },
    {
      name: "You",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-white/10 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-all duration-200 relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                )}
                <div className="relative">
                  <tab.icon className="w-6 h-6" />
                  {/* Show unread badge on Lineup icon */}
                  {tab.path === "/lineup" && totalUnread > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs bg-teal-500 hover:bg-teal-500 border-0"
                    >
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{tab.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
