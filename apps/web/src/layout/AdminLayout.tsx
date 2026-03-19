import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
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
  SettingsOutlined,
  AccountCircleOutlined,
  LockOutlined,
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
  hideSidebar?: boolean;
};

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
};

export default function AdminLayout({
  title,
  subtitle,
  actions,
  children,
  hideSidebar = false,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();
  const { logout, user } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);

  const navItems = useMemo<NavItem[]>(() => {
    const rawItems: NavItem[] = [
      { label: "Dashboard", path: "/dashboard", icon: <DashboardOutlined />, roles: ["super_admin", "clinic_admin", "profesional", "tutor"] },
      { label: "Clínicas", path: "/clinicas", icon: <ApartmentOutlined />, roles: ["super_admin", "clinic_admin"] },
      { label: "Usuarios", path: "/usuarios", icon: <PeopleAltOutlined />, roles: ["super_admin", "clinic_admin"] },
      { label: "Profesionales", path: "/profesionales", icon: <PsychologyAltOutlined />, roles: ["super_admin", "clinic_admin"] },
      { label: "Tutores", path: "/tutores", icon: <PersonOutlineOutlined />, roles: ["super_admin", "clinic_admin", "profesional"] },
      { label: "Pacientes", path: "/pacientes", icon: <Groups2Outlined />, roles: ["super_admin", "clinic_admin", "profesional"] },
      { label: "Suscripciones", path: "/suscripciones", icon: <ReceiptLongOutlined />, roles: ["super_admin", "clinic_admin"] },
    ];
    
    if (!user) return [];
    return rawItems.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user]);

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
        height: "100vh",
        position: "sticky",
        top: 0,
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
          onClick={async () => {
            await logout();
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
        {!hideSidebar ? (
          <Box sx={{ display: { xs: "none", lg: "block" } }}>{content}</Box>
        ) : null}

        {!hideSidebar ? (
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
        ) : null}

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
              {!hideSidebar ? (
                <IconButton
                  onClick={() => setMobileOpen(true)}
                  sx={{ display: { xs: "inline-flex", lg: "none" } }}
                >
                  <MenuIcon />
                </IconButton>
              ) : null}

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

              <Tooltip title="Notificaciones">
                <IconButton>
                  <NotificationsNoneOutlined />
                </IconButton>
              </Tooltip>

              <Tooltip title="Cuenta y configuración">
                <IconButton onClick={(e) => setAccountAnchor(e.currentTarget)}>
                  <SettingsOutlined />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>{children}</Box>
        </Box>
      </Box>

      <Menu
        anchorEl={accountAnchor}
        open={!!accountAnchor}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 240, borderRadius: 2 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Cuenta actual
          </Typography>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {user?.correo ?? "Sin sesión"}
          </Typography>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => {
            setAccountAnchor(null);
            navigate("/configuracion?tab=perfil");
          }}
        >
          <ListItemIcon>
            <AccountCircleOutlined fontSize="small" />
          </ListItemIcon>
          Mi perfil
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAccountAnchor(null);
            navigate("/configuracion?tab=seguridad");
          }}
        >
          <ListItemIcon>
            <LockOutlined fontSize="small" />
          </ListItemIcon>
          Inicio de sesión y seguridad
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAccountAnchor(null);
            navigate("/configuracion?tab=ayuda");
          }}
        >
          <ListItemIcon>
            <NotificationsNoneOutlined fontSize="small" />
          </ListItemIcon>
          Ayuda
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={async () => {
            setAccountAnchor(null);
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          Cerrar sesión
        </MenuItem>
      </Menu>
    </Box>
  );
}