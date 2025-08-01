import React from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { useUIStore } from '../../stores/ui';

const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useUIStore();

  const handleClose = (id: string) => {
    removeNotification(id);
  };

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || 6000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            <AlertTitle>{notification.title}</AlertTitle>
            {notification.message}
            {notification.action && (
              <Alert
                action={
                  <Alert
                    color="primary"
                    size="small"
                    onClick={notification.action.onClick}
                    sx={{ cursor: 'pointer' }}
                  >
                    {notification.action.label}
                  </Alert>
                }
              />
            )}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationSystem; 