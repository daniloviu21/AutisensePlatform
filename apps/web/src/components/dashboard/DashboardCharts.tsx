import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Box, Paper, Stack, Typography, useTheme, alpha } from "@mui/material";
import type { ChartDataSeries } from "./dashboard.types";

type GrowthChartProps = {
  categories: string[];
  series: ChartDataSeries[];
  title: string;
};

export function GrowthChart({ categories, series, title }: GrowthChartProps) {
  const theme = useTheme();

  const options: Highcharts.Options = {
    chart: {
      type: "areaspline",
      backgroundColor: "transparent",
      style: { fontFamily: theme.typography.fontFamily },
      spacing: [20, 0, 10, 0],
    },
    title: { text: undefined }, // Renderizamos el título con MUI por fuera
    credits: { enabled: false },
    legend: {
      itemStyle: { color: theme.palette.text.primary, fontWeight: "600" },
      itemHoverStyle: { color: theme.palette.primary.main },
    },
    xAxis: {
      categories,
      labels: { style: { color: theme.palette.text.secondary } },
      lineColor: theme.palette.divider,
      tickColor: theme.palette.divider,
    },
    yAxis: {
      title: { text: undefined },
      labels: { style: { color: theme.palette.text.secondary } },
      gridLineColor: theme.palette.divider,
      gridLineDashStyle: "Dash",
    },
    tooltip: {
      shared: true,
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.divider,
      borderRadius: 8,
      style: { color: theme.palette.text.primary, fontSize: "12px" },
      shadow: false,
    },
    plotOptions: {
      areaspline: {
        fillOpacity: 0.15,
        lineWidth: 3,
        marker: {
          radius: 4,
          lineWidth: 2,
          lineColor: theme.palette.background.paper,
        },
      },
    },
    series: series as Highcharts.SeriesOptionsType[],
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minHeight: 300, mt: 1 }}>
        <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: "100%", width: "100%" } }} />
      </Box>
    </Paper>
  );
}

type DistributionChartProps = {
  data: { name: string; y: number; color?: string }[];
  title: string;
};

export function DistributionChart({ data, title }: DistributionChartProps) {
  const theme = useTheme();

  const options: Highcharts.Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: { fontFamily: theme.typography.fontFamily },
      spacing: [10, 0, 10, 0],
    },
    title: { text: undefined },
    credits: { enabled: false },
    tooltip: {
      pointFormat: "<b>{point.percentage:.1f}%</b> ({point.y})",
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.divider,
      borderRadius: 8,
      style: { color: theme.palette.text.primary, fontSize: "13px" },
    },
    plotOptions: {
      pie: {
        innerSize: "60%", // Donut
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: false, // Leyenda limpia abajo
        },
        showInLegend: true,
        borderWidth: 2,
        borderColor: theme.palette.background.paper,
      },
    },
    legend: {
      itemStyle: { color: theme.palette.text.primary, fontWeight: "600" },
      itemHoverStyle: { color: theme.palette.primary.main },
      layout: "horizontal",
      align: "center",
      verticalAlign: "bottom",
    },
    series: [
      {
        type: "pie",
        name: "Distribución",
        data,
      },
    ],
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minHeight: 300, mt: 1 }}>
        <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: "100%", width: "100%" } }} />
      </Box>
    </Paper>
  );
}
