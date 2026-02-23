import React, { createContext, useCallback, useContext, useState } from 'react';
import { CustomAlert } from './CustomAlert';

interface AlertAction {
    text: string;
    onPress?: () => void | Promise<void>;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
    title: string;
    message: string;
    actions?: AlertAction[];
    isDestructive?: boolean;
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertOptions>({
        title: '',
        message: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const showAlert = useCallback((options: AlertOptions) => {
        setConfig(options);
        setVisible(true);
    }, []);

    const hideAlert = useCallback(() => {
        setVisible(false);
    }, []);

    const handleConfirm = async () => {
        const confirmAction = config.actions?.find(a => a.style !== 'cancel');
        if (confirmAction?.onPress) {
            try {
                // Support async actions
                const result = confirmAction.onPress();
                if (result && typeof (result as any).then === 'function') {
                    setIsLoading(true);
                    await result;
                }
            } catch (error) {
                console.error('Alert confirm action error:', error);
            } finally {
                setIsLoading(false);
            }
        }
        hideAlert();
    };

    const handleCancel = () => {
        const cancelAction = config.actions?.find(a => a.style === 'cancel');
        if (cancelAction?.onPress) {
            cancelAction.onPress();
        }
        hideAlert();
    };

    // Map AlertAction[] to CustomAlert props
    const confirmAction = config.actions?.find(a => a.style !== 'cancel');
    const cancelAction = config.actions?.find(a => a.style === 'cancel');

    // If no actions provided, we only want an OK button (notification style)
    const hasCancelAction = !!cancelAction;

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomAlert
                visible={visible}
                title={config.title}
                message={config.message}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                confirmText={confirmAction?.text || 'OK'}
                cancelText={hasCancelAction ? cancelAction?.text || 'Cancel' : undefined}
                isDestructive={config.isDestructive || confirmAction?.style === 'destructive'}
                isLoading={isLoading}
            />
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
