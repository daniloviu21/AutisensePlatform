import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ApartmentOutlined,
  DashboardOutlined,
  DarkMode,
  LightMode,
  LogoutOutlined,
  Menu as MenuIcon,
  NotificationsNoneOutlined,
  PeopleAltOutlined,
  PsychologyAltOutlined,
  PersonOutlineOutlined,
  ReceiptLongOutlined,
  Groups2Outlined,
} from "@mui/icons-material";
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useColorMode } from "../theme/ColorModeProvider";
import { useAuth } from "../auth/AuthContext";

type AdminLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

export default function AdminLayout({
  title,
  subtitle,
  actions,
  children,
}: AdminLayoutProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: "Dashboard", path: "/dashboard", icon: <DashboardOutlined /> },
      { label: "Clínicas", path: "/clinicas", icon: <ApartmentOutlined /> },
      { label: "Usuarios", path: "/usuarios", icon: <PeopleAltOutlined /> },
      { label: "Profesionales", path: "/profesionales", icon: <PsychologyAltOutlined /> },
      { label: "Tutores", path: "/tutores", icon: <PersonOutlineOutlined /> },
      { label: "Pacientes", path: "/pacientes", icon: <Groups2Outlined /> },
      { label: "Suscripciones", path: "/suscripciones", icon: <ReceiptLongOutlined /> },
    ],
    []
  );

  const shellBg =
    mode === "dark"
      ? "linear-gradient(180deg, #0A1016 0%, #0F1720 100%)"
      : "linear-gradient(180deg, #F5F8FC 0%, #EEF3F8 100%)";

  const sidebarBg =
    mode === "dark"
      ? "linear-gradient(180deg, #0B1218 0%, #0F1720 100%)"
      : "#FFFFFF";

  const sidebarBorder =
    mode === "dark"
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(15,23,42,0.08)";

  const headerBorder =
    mode === "dark"
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(15,23,42,0.08)";

  const content = (
    <Box
      sx={{
        width: 272,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: sidebarBg,
        borderRight: sidebarBorder,
      }}
    >
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "text.primary",
          }}
        >
          AutiSense
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Panel administrativo
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.path;

          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                minHeight: 46,
                borderRadius: 2,
                mb: 0.5,
                color: selected ? "primary.main" : "text.secondary",
                backgroundColor: selected
                  ? mode === "dark"
                    ? "rgba(42,157,143,0.14)"
                    : "rgba(42,157,143,0.10)"
                  : "transparent",
                "&:hover": {
                  backgroundColor:
                    mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(15,23,42,0.04)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 38,
                  color: selected ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: selected ? 700 : 600,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 1.5 }} />
        <ListItemButton
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          sx={{
            borderRadius: 2,
            minHeight: 44,
            color: "text.secondary",
            "&:hover": {
              backgroundColor:
                mode === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(15,23,42,0.04)",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: "text.secondary" }}>
            <LogoutOutlined />
          </ListItemIcon>
          <ListItemText
            primary="Cerrar sesión"
            primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", background: shellBg }}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Box sx={{ display: { xs: "none", lg: "block" } }}>{content}</Box>

        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: "block", lg: "none" },
            "& .MuiDrawer-paper": {
              width: 272,
              borderRight: "none",
              backgroundImage: "none",
            },
          }}
        >
          {content}
        </Drawer>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              height: 72,
              px: { xs: 2, md: 3 },
              borderBottom: headerBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor:
                mode === "dark" ? "rgba(10,16,22,0.72)" : "rgba(255,255,255,0.82)",
              backdropFilter: "blur(10px)",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ display: { xs: "inline-flex", lg: "none" } }}
              >
                <MenuIcon />
              </IconButton>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: { xs: 24, md: 28 },
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                  }}
                  noWrap
                >
                  {title}
                </Typography>
                {subtitle ? (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {subtitle}
                  </Typography>
                ) : null}
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {actions}

              <Tooltip title={mode === "dark" ? "Modo claro" : "Modo oscuro"}>
                <IconButton onClick={toggle}>
                  {mode === "dark" ? <LightMode /> : <DarkMode />}
                </IconButton>
              </Tooltip>

              <IconButton>
                <NotificationsNoneOutlined />
              </IconButton>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}