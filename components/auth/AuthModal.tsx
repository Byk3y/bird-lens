import { useAlert } from '@/components/common/AlertProvider';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowLeft,
    ChevronDown,
    Eye,
    EyeOff
} from 'lucide-react-native';
import { AnimatePresence, MotiView } from 'moti';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SwipeToClose = ({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) => {
    const translateX = useSharedValue(0);

    const gesture = Gesture.Pan()
        .activeOffsetX([0, 20]) // Only trigger for rightward swipe
        .onUpdate((event) => {
            if (event.translationX > 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX > width * 0.3 || event.velocityX > 800) {
                translateX.value = withTiming(width, { duration: 250 }, () => {
                    runOnJS(onDismiss)();
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
};

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pwd)) return 'Password must include an uppercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must include a number.';
    return null;
};

export const AuthModal = ({ visible, onClose, initialMode = 'login' }: AuthModalProps) => {
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Rate Limiting States
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

    const { signIn, signUp, resetPassword } = useAuth();
    const { showAlert } = useAlert();

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const handleSubmit = async () => {
        if (lockoutUntil && Date.now() < lockoutUntil) {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            showAlert({
                title: 'Too many attempts',
                message: `Please try again in ${remaining} seconds.`
            });
            return;
        }

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            showAlert({
                title: 'Error',
                message: 'Please enter both email and password.'
            });
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            showAlert({
                title: 'Invalid Email',
                message: 'Please enter a valid email address.'
            });
            return;
        }

        if (mode === 'signup') {
            const pwdError = validatePassword(trimmedPassword);
            if (pwdError) {
                showAlert({
                    title: 'Weak Password',
                    message: pwdError
                });
                return;
            }
        }

        setIsLoading(true);
        try {
            const { error } = mode === 'login'
                ? await signIn(trimmedEmail, trimmedPassword)
                : await signUp(trimmedEmail, trimmedPassword);

            if (error) {
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);

                if (newAttempts >= 5) {
                    setLockoutUntil(Date.now() + 60000); // lock for 60 seconds
                    setFailedAttempts(0); // reset counter for next cycle
                    showAlert({
                        title: 'Temporarily Locked',
                        message: 'Too many failed attempts. Please try again in 1 minute.'
                    });
                } else {
                    showAlert({
                        title: 'Authentication Error',
                        message: error.message
                    });
                }
            } else {
                setFailedAttempts(0);
                setLockoutUntil(null);

                if (mode === 'signup') {
                    showAlert({
                        title: 'Success!',
                        message: 'Your account has been created. Your collection is now safely synced.',
                        actions: [{ text: 'Great', onPress: onClose }]
                    });
                } else {
                    onClose();
                }
            }
        } catch (err) {
            showAlert({
                title: 'Error',
                message: 'An unexpected error occurred. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const trimmedEmail = email.trim();
        if (!validateEmail(trimmedEmail)) {
            showAlert({
                title: 'Invalid Email',
                message: 'Please enter a valid email address to reset your password.'
            });
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await resetPassword(trimmedEmail);
            if (error) {
                showAlert({
                    title: 'Error',
                    message: error.message
                });
            } else {
                showAlert({
                    title: 'Password Reset',
                    message: 'Check your email for a password reset link.'
                });
            }
        } catch (err) {
            showAlert({
                title: 'Error',
                message: 'An unexpected error occurred. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            onRequestClose={onClose}
        >
            <AnimatePresence>
                {visible && (
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'timing', duration: 400 }}
                            style={styles.container}
                        >
                            <SwipeToClose onDismiss={onClose}>
                                <SafeAreaView style={styles.safeArea}>
                                    <KeyboardAvoidingView
                                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                        style={styles.keyboardView}
                                    >
                                        {/* Header Navigation */}
                                        <View style={styles.topNav}>
                                            <Pressable
                                                onPress={onClose}
                                                style={styles.backBtn}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <View style={styles.backIconCircle}>
                                                    <ArrowLeft color={Colors.text} size={24} strokeWidth={2.5} />
                                                </View>
                                            </Pressable>
                                        </View>

                                        <Pressable
                                            style={{ flex: 1 }}
                                            onPress={Keyboard.dismiss}
                                        >
                                            <View style={styles.mainContent}>
                                                {/* Branding */}
                                                <View style={styles.branding}>
                                                    <Text style={styles.brandTitle}>Birdsnap</Text>
                                                </View>

                                                {/* Form */}
                                                <View style={styles.form}>
                                                    <Pressable
                                                        style={styles.inputWrapper}
                                                        onPress={() => emailRef.current?.focus()}
                                                    >
                                                        <TextInput
                                                            ref={emailRef}
                                                            placeholder="Email Address"
                                                            placeholderTextColor={Colors.textTertiary}
                                                            style={styles.lineInput}
                                                            value={email}
                                                            onChangeText={setEmail}
                                                            autoCapitalize="none"
                                                            keyboardType="email-address"
                                                        />
                                                    </Pressable>

                                                    <Pressable
                                                        style={styles.inputWrapper}
                                                        onPress={() => passwordRef.current?.focus()}
                                                    >
                                                        <View style={styles.passwordContainer}>
                                                            <TextInput
                                                                ref={passwordRef}
                                                                placeholder="Password"
                                                                placeholderTextColor={Colors.textTertiary}
                                                                style={[styles.lineInput, { flex: 1 }]}
                                                                secureTextEntry={!showPassword}
                                                                value={password}
                                                                onChangeText={setPassword}
                                                            />
                                                            <Pressable
                                                                onPress={() => setShowPassword(!showPassword)}
                                                                style={styles.eyeIcon}
                                                            >
                                                                {showPassword ? <EyeOff color={Colors.textTertiary} size={18} /> : <Eye color={Colors.textTertiary} size={18} />}
                                                            </Pressable>
                                                        </View>
                                                    </Pressable>

                                                    {mode === 'login' && (
                                                        <Pressable style={styles.forgotBtn} onPress={handleForgotPassword}>
                                                            <Text style={styles.forgotText}>Forgot your password?</Text>
                                                        </Pressable>
                                                    )}

                                                    <Pressable
                                                        onPress={handleSubmit}
                                                        disabled={isLoading}
                                                        style={({ pressed }) => [
                                                            styles.submitBtnContainer,
                                                            pressed && { opacity: 0.9 }
                                                        ]}
                                                    >
                                                        <LinearGradient
                                                            colors={[Colors.primary, '#FF6B6B']}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 0 }}
                                                            style={styles.gradientBtn}
                                                        >
                                                            {isLoading ? (
                                                                <ActivityIndicator color={Colors.white} />
                                                            ) : (
                                                                <Text style={styles.submitBtnText}>
                                                                    {mode === 'login' ? 'Sign in' : 'Sign up'}
                                                                </Text>
                                                            )}
                                                        </LinearGradient>
                                                    </Pressable>

                                                    <View style={styles.switchModeContainer}>
                                                        <Text style={styles.switchModeText}>
                                                            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                                        </Text>
                                                        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                                                            <Text style={styles.switchModeLink}>
                                                                {mode === 'login' ? 'Sign up' : 'Sign in'}
                                                            </Text>
                                                        </Pressable>
                                                    </View>

                                                    <View style={styles.socialToggle}>
                                                        <Text style={styles.socialToggleText}>or continue with </Text>
                                                        <ChevronDown color={Colors.textTertiary} size={16} />
                                                    </View>
                                                </View>
                                            </View>
                                        </Pressable>

                                        {/* Footer Legal */}
                                        <View style={styles.legalFooter}>
                                            <Text style={styles.legalText}>
                                                By joining Birdsnap, you acknowledge that you have read and agree to our{' '}
                                                <Text style={styles.legalLink}>Terms of Use</Text> and{' '}
                                                <Text style={styles.legalLink}>Privacy Policy</Text>
                                            </Text>
                                        </View>
                                    </KeyboardAvoidingView>
                                </SafeAreaView>
                            </SwipeToClose>
                        </MotiView>
                    </GestureHandlerRootView>
                )}
            </AnimatePresence>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
    },
    topNav: {
        height: 60,
        justifyContent: 'center',
        paddingLeft: Spacing.md,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainContent: {
        flex: 1,
        paddingTop: height * 0.05,
    },
    branding: {
        alignItems: 'center',
        marginBottom: height * 0.08,
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: -1,
    },
    form: {
        gap: Spacing.xl,
    },
    inputWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        height: 50,
        justifyContent: 'center',
    },
    lineInput: {
        fontSize: 18,
        color: Colors.text,
        fontWeight: '400',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eyeIcon: {
        padding: 8,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: -Spacing.md,
    },
    forgotText: {
        fontSize: 14,
        color: Colors.textTertiary,
        fontWeight: '500',
    },
    submitBtnContainer: {
        marginTop: Spacing.md,
        borderRadius: 28,
        overflow: 'hidden',
    },
    gradientBtn: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.white,
    },
    switchModeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    switchModeText: {
        fontSize: 15,
        color: Colors.text,
    },
    switchModeLink: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    socialToggle: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 4,
    },
    socialToggleText: {
        fontSize: 14,
        color: Colors.textTertiary,
    },
    legalFooter: {
        paddingBottom: Spacing.xl,
    },
    legalText: {
        fontSize: 12,
        color: Colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: Spacing.md,
    },
    legalLink: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
