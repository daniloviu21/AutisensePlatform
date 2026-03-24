import { createTheme } from "@mui/material/styles";

export function buildTheme(mode: "light" | "dark") {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === "light" ? "#1A5C8A" : "#5BAFD6" },
      secondary: { main: "#2E9E6B" },
      background: {
        default: mode === "light" ? "#F5F0E8" : "#0D1E2C",
        paper: mode === "light" ? "#FFFFFF" : "#112130",
      },
      text: {
        primary: mode === "light" ? "#2C3E50" : "#E8F0F6",
        secondary: mode === "light" ? "#7F8C8D" : "#8AAFC4",
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