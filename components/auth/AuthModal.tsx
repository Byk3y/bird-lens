import { useAlert } from '@/components/common/AlertProvider';
import { Links } from '@/constants/Links';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { calculatePasswordStrength, debounce } from '@/lib/utils';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import {
    AlertCircle,
    ArrowLeft,
    CircleCheck as Check,
    Eye,
    EyeOff
} from 'lucide-react-native';
import { AnimatePresence, MotiText, MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
        .activeOffsetX([0, 10]) // Start tracking after 10 pixels of rightward movement
        .failOffsetY([-30, 30]) // More relaxed vertical failure threshold
        .onUpdate((event) => {
            if (event.translationX > 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX > width * 0.2 || event.velocityX > 600) {
                translateX.value = withTiming(width, { duration: 250 }, () => {
                    runOnJS(onDismiss)();
                });
            } else {
                translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
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

const PasswordRequirementItem = ({ label, met, show }: { label: string; met: boolean; show: boolean }) => (
    <MotiView
        animate={{
            opacity: show ? 1 : 0,
            height: show ? 'auto' : 0,
            marginBottom: show ? 4 : 0
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
        {met ? (
            <View pointerEvents="none">
                <Check size={14} color={Colors.success || '#34C759'} />
            </View>
        ) : (
            <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: Colors.textTertiary }} />
        )}
        <Text style={{ fontSize: 12, color: met ? Colors.text : Colors.textTertiary }}>{label}</Text>
    </MotiView>
);

export const AuthModal = ({ visible, onClose, initialMode = 'login' }: AuthModalProps) => {
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Validation states
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof calculatePasswordStrength> | null>(null);

    // Rate Limiting States
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

    const { signIn, signUp, resetPassword, checkEmailAvailability } = useAuth();
    const { showAlert } = useAlert();

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    // Debounced email availability check
    const checkEmail = useCallback(
        debounce(async (emailVal: string) => {
            if (!validateEmail(emailVal) || mode === 'login') {
                setEmailAvailable(null);
                setIsCheckingEmail(false);
                return;
            }

            const { exists, error } = await checkEmailAvailability(emailVal);
            if (!error) {
                setEmailAvailable(!exists);
                if (exists) {
                    setEmailError('This email is already registered.');
                } else {
                    setEmailError(null);
                }
            }
            setIsCheckingEmail(false);
        }, 500),
        [mode, checkEmailAvailability]
    );

    // Reset state when modal becomes invisible
    useEffect(() => {
        if (!visible) {
            setEmail('');
            setPassword('');
            setEmailError(null);
            setEmailAvailable(null);
            setIsCheckingEmail(false);
            setPasswordStrength(null);
            setShowPassword(false);
            setMode(initialMode);
            setFailedAttempts(0);
            setLockoutUntil(null);
        }
    }, [visible, initialMode]);

    useEffect(() => {
        if (mode === 'signup' && email) {
            if (validateEmail(email)) {
                setIsCheckingEmail(true);
                checkEmail(email);
            } else {
                setEmailError('Please enter a valid email.');
                setEmailAvailable(null);
            }
        } else {
            setEmailError(null);
            setEmailAvailable(null);
        }
    }, [email, mode, checkEmail]);

    useEffect(() => {
        if (mode === 'signup') {
            setPasswordStrength(calculatePasswordStrength(password));
        } else {
            setPasswordStrength(null);
        }
    }, [password, mode]);

    // Clear all states when modal is closed
    useEffect(() => {
        if (!visible) {
            setEmail('');
            setPassword('');
            setEmailError(null);
            setEmailAvailable(null);
            setIsCheckingEmail(false);
            setPasswordStrength(null);
            setShowPassword(false);
            setFailedAttempts(0);
            setLockoutUntil(null);
            // Optionally keep the mode as it was or reset to initialMode
            setMode(initialMode);
        }
    }, [visible, initialMode]);

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
            if (emailError || emailAvailable === false) return;
            if (passwordStrength && passwordStrength.score < 3) return;
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
        <AnimatePresence>
            {visible && (
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
                                        <View style={styles.backIconCircle} pointerEvents="none">
                                            <ArrowLeft color={Colors.text} size={24} strokeWidth={2.5} />
                                        </View>
                                    </Pressable>
                                </View>

                                <Pressable hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    style={{ flex: 1 }}
                                    onPress={Keyboard.dismiss}
                                >
                                    <View style={styles.mainContent}>
                                        {/* Branding */}
                                        <View style={styles.branding}>
                                            <Text style={styles.brandTitle}>BirdMark</Text>
                                        </View>

                                        {/* Form */}
                                        <View style={styles.form}>
                                            <View>
                                                <Pressable
                                                    style={[
                                                        styles.inputWrapper,
                                                        emailError ? styles.inputWrapperError : (emailAvailable ? styles.inputWrapperSuccess : null)
                                                    ]}
                                                    onPress={() => emailRef.current?.focus()}
                                                >
                                                    <View style={styles.inputRow}>
                                                        <TextInput
                                                            ref={emailRef}
                                                            placeholder="Email Address"
                                                            placeholderTextColor={Colors.textTertiary}
                                                            style={styles.lineInput}
                                                            value={email}
                                                            onChangeText={setEmail}
                                                            autoCapitalize="none"
                                                            keyboardType="email-address"
                                                            autoCorrect={false}
                                                            spellCheck={false}
                                                        />
                                                        {isCheckingEmail && <ActivityIndicator size="small" color={Colors.primary} />}
                                                        {!isCheckingEmail && emailAvailable && (
                                                            <View pointerEvents="none">
                                                                <Check size={18} color={Colors.success || '#34C759'} />
                                                            </View>
                                                        )}
                                                        {!isCheckingEmail && emailError && (
                                                            <View pointerEvents="none">
                                                                <AlertCircle size={18} color="#FF3B30" />
                                                            </View>
                                                        )}
                                                    </View>
                                                </Pressable>
                                                {emailError && (
                                                    <MotiText
                                                        from={{ opacity: 0, translateY: -5 }}
                                                        animate={{ opacity: 1, translateY: 0 }}
                                                        style={styles.errorText}
                                                    >
                                                        {emailError}
                                                    </MotiText>
                                                )}
                                            </View>

                                            <View>
                                                <Pressable hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                    style={[
                                                        styles.inputWrapper,
                                                        mode === 'signup' && passwordStrength && passwordStrength.score < 2 && password.length > 0 ? styles.inputWrapperError : null
                                                    ]}
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
                                                            <View pointerEvents="none">
                                                                {showPassword ? <EyeOff color={Colors.textTertiary} size={18} /> : <Eye color={Colors.textTertiary} size={18} />}
                                                            </View>
                                                        </Pressable>
                                                    </View>
                                                </Pressable>

                                                {mode === 'signup' && password.length > 0 && (
                                                    <MotiView
                                                        from={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        style={styles.strengthContainer}
                                                    >
                                                        <View style={styles.strengthBarRow}>
                                                            <View style={styles.strengthBarBg}>
                                                                <MotiView
                                                                    animate={{
                                                                        width: `${(passwordStrength?.score ?? 0) * 25}%`,
                                                                        backgroundColor: passwordStrength?.color
                                                                    }}
                                                                    style={styles.strengthBarFill}
                                                                />
                                                            </View>
                                                            <Text style={[styles.strengthLabel, { color: passwordStrength?.color }]}>
                                                                {passwordStrength?.label}
                                                            </Text>
                                                        </View>

                                                        <View style={styles.requirementsGrid}>
                                                            {passwordStrength?.requirements.map((req) => (
                                                                <PasswordRequirementItem
                                                                    key={req.id}
                                                                    label={req.label}
                                                                    met={req.met}
                                                                    show={true}
                                                                />
                                                            ))}
                                                        </View>
                                                    </MotiView>
                                                )}
                                            </View>

                                            {mode === 'login' && (
                                                <Pressable style={styles.forgotBtn} onPress={handleForgotPassword}>
                                                    <Text style={styles.forgotText}>Forgot your password?</Text>
                                                </Pressable>
                                            )}

                                            <Pressable
                                                onPress={handleSubmit}
                                                disabled={isLoading || (mode === 'signup' && (!!emailError || !email || !password || (passwordStrength?.score ?? 0) < 3))}
                                                style={({ pressed }) => [
                                                    styles.submitBtnContainer,
                                                    (pressed || isLoading) && { opacity: 0.8 },
                                                    (mode === 'signup' && (!!emailError || !email || !password || (passwordStrength?.score ?? 0) < 3)) && { opacity: 0.5 }
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

                                        </View>
                                    </View>
                                </Pressable>

                            </KeyboardAvoidingView>

                            {/* Footer Legal */}
                            <View style={styles.legalFooter}>
                                <Text style={styles.legalText}>
                                    By joining BirdMark, you acknowledge that you have read and agree to our{' '}
                                    <Text
                                        style={styles.legalLink}
                                        onPress={() => WebBrowser.openBrowserAsync(Links.TERMS_OF_USE)}
                                    >
                                        Terms of Use
                                    </Text> and{' '}
                                    <Text
                                        style={styles.legalLink}
                                        onPress={() => WebBrowser.openBrowserAsync(Links.PRIVACY_POLICY)}
                                    >
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </View>
                        </SafeAreaView>
                    </SwipeToClose>
                </MotiView>
            )}
        </AnimatePresence>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.white,
        zIndex: 100,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
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
        paddingTop: height * 0.02,
        paddingHorizontal: Spacing.xl,
    },
    branding: {
        alignItems: 'center',
        marginBottom: height * 0.04,
    },
    brandTitle: {
        fontSize: 34,
        fontFamily: 'Outfit_600SemiBold',
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
    inputWrapperError: {
        borderBottomColor: '#FF3B30',
    },
    inputWrapperSuccess: {
        borderBottomColor: '#34C759',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    strengthContainer: {
        marginTop: 8,
    },
    strengthBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    strengthBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: '#f0f0f0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '700',
        width: 50,
    },
    requirementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    lineInput: {
        flex: 1,
        fontSize: 19,
        color: Colors.text,
        fontFamily: 'Inter_400Regular',
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
        fontSize: 19,
        fontFamily: 'Outfit_600SemiBold',
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
