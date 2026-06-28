import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Typography,
} from '@mui/material';

interface RecurringDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: (scope: 'this' | 'following' | 'all') => void;
}

export const RecurringDeleteDialog: React.FC<RecurringDeleteDialogProps> = ({
  open,
  onClose,
  onDelete,
}) => {
  const [scope, setScope] = useState<'this' | 'following' | 'all'>('this');

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { width: 400, borderRadius: '8px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 500, color: '#3c4043' }}>
          Delete recurring event
        </Typography>
      </DialogTitle>
      <DialogContent>
        <FormControl component="fieldset">
          <RadioGroup
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
          >
            <FormControlLabel
              value="this"
              control={<Radio color="primary" />}
              label="This event"
              sx={{ '& .MuiTypography-root': { color: '#3c4043', fontSize: '0.875rem' } }}
            />
            <FormControlLabel
              value="following"
              control={<Radio color="primary" />}
              label="This and following events"
              sx={{ '& .MuiTypography-root': { color: '#3c4043', fontSize: '0.875rem' } }}
            />
            <FormControlLabel
              value="all"
              control={<Radio color="primary" />}
              label="All events"
              sx={{ '& .MuiTypography-root': { color: '#3c4043', fontSize: '0.875rem' } }}
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#5f6368', fontWeight: 500 }}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onDelete(scope);
            onClose();
          }}
          variant="contained"
          color="error"
          sx={{ textTransform: 'none', boxShadow: 'none' }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
