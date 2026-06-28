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

interface RecurringEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (scope: 'this' | 'following' | 'all') => void;
}

export const RecurringEditDialog: React.FC<RecurringEditDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [scope, setScope] = useState<'this' | 'following' | 'all'>('this');

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { width: 400, borderRadius: '8px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 500, color: '#3c4043' }}>
          Edit recurring event
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
            onSave(scope);
            onClose();
          }}
          variant="contained"
          sx={{ textTransform: 'none', boxShadow: 'none', backgroundColor: '#1a73e8', '&:hover': { backgroundColor: '#1557b0', boxShadow: 'none' } }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};
