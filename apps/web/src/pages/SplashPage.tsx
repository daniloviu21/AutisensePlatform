import { Box, Typography } from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SplashPage() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => nav("/login", { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(900px circle at 20% 20%, rgba(42,157,143,0.20), transparent 55%), radial-gradient(900px circle at 90% 10%, rgba(69,123,157,0.18), transparent 45%)",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Box
          sx={{
            width: 76,
            height: 76,
            borderRadius: "22px",
            mx: "auto",
            background: "linear-gradient(135deg, rgba(42,157,143,0.95), rgba(69,123,157,0.95))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: -40,
              background: "conic-gradient(from 180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.35), rgba(255,255,255,0.0))",
              animation: "spin 1.2s linear infinite",
              "@keyframes spin": { to: { transform: "rotate(360deg)" } },
            }}
          />
        </Box>

        <Typography variant="h5" sx={{ mt: 2, fontWeight: 800 }}>
          AutiSense
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Panel administrativo
        </Typography>
      </Box>
    </Box>
  );
}