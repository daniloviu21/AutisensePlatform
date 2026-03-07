import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type ConfirmUserActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmUserActionDialog({
  open,
  title,
  description,
  confirmText,
  onClose,
  onConfirm,
}: ConfirmUserActionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>

      <DialogContent>
        <Typography color="text.secondary">{description}</Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button onClick={onConfirm} variant="contained">
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}