import React from "react";
import { Box, Paper, Typography, Stack, Avatar, Divider, alpha } from "@mui/material";
import {
  CheckCircleOutline,
  InfoOutlined,
  WarningAmberOutlined,
  ErrorOutlineOutlined,
} from "@mui/icons-material";
import type { ActivityItem } from "./dashboard.types";

const TYPE_CONFIG = {
  success: {
    icon: <CheckCircleOutline fontSize="small" />,
    color: "#0F766E",
    bg: alpha("#2A9D8F", 0.15),
  },
  info: {
    icon: <InfoOutlined fontSize="small" />,
    color: "#1D4ED8",
    bg: alpha("#3B82F6", 0.15),
  },
  warning: {
    icon: <WarningAmberOutlined fontSize="small" />,
    color: "#B45309",
    bg: alpha("#F59E0B", 0.15),
  },
  error: {
    icon: <ErrorOutlineOutlined fontSize="small" />,
    color: "#B91C1C",
    bg: alpha("#EF4444", 0.15),
  },
};

type Props = {
  items: ActivityItem[];
};

export default function DashboardRecentActivity({ items }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 3, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" fontWeight={800}>
          Actividad reciente
        </Typography>
      </Box>

      <Stack
        spacing={0}
        sx={{
          flex: 1,
          overflowY: "auto",
          bgcolor: "background.paper",
        }}
      >
        {items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No hay actividad reciente.</Typography>
          </Box>
        ) : (
          items.map((item, index) => {
            const conf = TYPE_CONFIG[item.type];
            return (
              <React.Fragment key={item.id}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    px: 3,
                    py: 2.5,
                    "&:hover": { bgcolor: alpha(conf.color, 0.02) },
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: conf.bg,
                      color: conf.color,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {conf.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1, lineHeight: 1.4 }}>
                      {item.description}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" fontWeight={600}>
                      {item.timestamp}
                    </Typography>
                  </Box>
                </Stack>
                {index < items.length - 1 && <Divider component="li" sx={{ ml: 8, mr: 3 }} />}
              </React.Fragment>
            );
          })
        )}
      </Stack>
    </Paper>
  );
}
