import { createTheme } from "@mui/material/styles";

export function buildTheme(mode: "light" | "dark") {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === "light" ? "#2A9D8F" : "#5ED6C7" },
      secondary: { main: mode === "light" ? "#457B9D" : "#7FB3D5" },
      background: {
        default: mode === "light" ? "#F6F8FB" : "#0E141B",
        paper: mode === "light" ? "#FFFFFF" : "#141C24",
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial"].join(","),
    },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },
      MuiTextField: { defaultProps: { fullWidth: true } },
    },
  });
}