import React from "react";
import { Box, Paper, Stack, Typography, useTheme, alpha } from "@mui/material";
import {
  GroupsOutlined,
  MedicalServicesOutlined,
  ApartmentOutlined,
  CalendarTodayOutlined,
  TrendingUpOutlined,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import type { KpiMetric } from "./dashboard.types";

const ICONS = {
  users: <GroupsOutlined fontSize="inherit" />,
  medical: <MedicalServicesOutlined fontSize="inherit" />,
  building: <ApartmentOutlined fontSize="inherit" />,
  calendar: <CalendarTodayOutlined fontSize="inherit" />,
  activity: <TrendingUpOutlined fontSize="inherit" />,
};

type Props = {
  kpis: KpiMetric[];
};

export default function DashboardKpiCards({ kpis }: Props) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "1fr 1fr",
          md: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
        },
        gap: 2,
      }}
    >
      {kpis.map((kpi) => {
        const isPositive = kpi.trend !== undefined && kpi.trend >= 0;
        const trendColor = isPositive ? "#0F766E" : "#B91C1C";
        const trendBgColor = isPositive
          ? alpha("#2A9D8F", 0.15)
          : alpha("#EF4444", 0.15);

        return (
          <Paper
            key={kpi.id}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: theme.shadows[2],
              },
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
                sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}
              >
                {kpi.label}
              </Typography>
              <Box
                sx={{
                  color: kpi.color || "primary.main",
                  bgcolor: alpha(kpi.color || theme.palette.primary.main, 0.1),
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {ICONS[kpi.iconType]}
              </Box>
            </Stack>

            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {kpi.value}
            </Typography>

            {kpi.trend !== undefined && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: "auto" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    bgcolor: trendBgColor,
                    color: trendColor,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {isPositive ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />}
                  {Math.abs(kpi.trend)}%
                </Box>
                <Typography variant="caption" color="text.disabled" fontWeight={500}>
                  {kpi.trendLabel || "vs mes anterior"}
                </Typography>
              </Stack>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
