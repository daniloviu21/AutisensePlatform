import { Box, Button, Typography, Stack, Card, CardContent } from "@mui/material";
import { CloudUploadOutlined, InsertDriveFileOutlined, CheckCircleOutlined, VideocamOutlined } from "@mui/icons-material";
import { useRef, useState } from "react";

type Props = {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onStartAnalysis: () => void;
  isStartDisabled: boolean;
};

export default function AnalisisVideoDropzone({ file, onFileSelect, onStartAnalysis, isStartDisabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // Basic validation for this mock feature
      if (droppedFile.type.startsWith("video/")) {
        onFileSelect(droppedFile);
      } else {
        alert("Por favor, selecciona un archivo de video (MP4, MOV, AVI).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <VideocamOutlined color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Video a Analizar
          </Typography>
        </Stack>

        {!file ? (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            sx={{
              p: 6,
              textAlign: "center",
              cursor: "pointer",
              borderRadius: 3,
              border: "2px dashed",
              borderColor: isDragging ? "primary.main" : "divider",
              bgcolor: isDragging ? "primary.50" : "background.default",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <CloudUploadOutlined sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Haz clic o arrastra un video aquí
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Aceptamos formatos MP4, MOV, o AVI
            </Typography>

            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo"
              hidden
              ref={inputRef}
              onChange={handleFileChange}
            />

            <Button variant="outlined" size="small" sx={{ borderRadius: 2 }}>
              Explorar archivos
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: "primary.50",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}
              >
                <InsertDriveFileOutlined color="primary" />
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={600} sx={{ wordBreak: "break-all" }}>
                  {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatSize(file.size)} • Listo para simulación
                </Typography>
              </Box>
            </Stack>

            <Button
              color="error"
              size="small"
              onClick={() => onFileSelect(null)}
              sx={{ minWidth: "auto", px: 2 }}
            >
              Cambiar
            </Button>
          </Box>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "flex-end" }}
          spacing={3}
          sx={{ mt: 4 }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
              RECOMENDACIONES PARA EL VIDEO:
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlined color="success" sx={{ fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">Duración sugerida entre 2 y 5 minutos.</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlined color="success" sx={{ fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">Rostro y cuerpo del infante visibles.</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlined color="success" sx={{ fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">Entorno bien iluminado, preferiblemente luz natural.</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlined color="success" sx={{ fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">Evitar ruidos de fondo o personas cruzando frente a la cámara.</Typography>
              </Stack>
            </Stack>
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={onStartAnalysis}
            disabled={isStartDisabled}
            sx={{ borderRadius: 2, px: 4, py: 1.5, fontWeight: 600, boxShadow: 2, flexShrink: 0 }}
          >
            Iniciar Análisis
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
