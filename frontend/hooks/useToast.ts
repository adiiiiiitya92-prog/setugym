import { DeviceEventEmitter } from 'react-native';

export interface ToastEvent {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const useToast = () => {
  const show = (message: string, type: ToastEvent['type'] = 'info') => {
    DeviceEventEmitter.emit('SHOW_TOAST', { message, type });
  };

  const success = (message: string) => show(message, 'success');
  const error = (message: string) => show(message, 'error');
  const info = (message: string) => show(message, 'info');
  const warning = (message: string) => show(message, 'warning');

  return { show, success, error, info, warning };
};
