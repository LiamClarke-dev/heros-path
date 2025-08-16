import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { ThemeAwareNavigationWrapper, ThemeAwareText } from './ThemeAwareNavigationWrapper';
import { useThemeAwareIcons } from '../../hooks/useThemeTransition';
import { ThemeSwitcher } from './ThemeSwitcher';

/**
 * Custom drawer content with user profile and navigation items
 */
export function CustomDrawerContent(props) {
  const { theme, navigationStyles } = useTheme();
  const { user, signOut } = useUser();
  const { getNavigationIcons } = useThemeAwareIcons();
  
  const navigationIcons = getNavigationIcons();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      ...navigationStyles.drawerHeader,
      marginBottom: 10,
      // Add gradient-like effect for adventure theme
      ...(theme.colors.primary === '#8B4513' && {
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.secondary,
      }),
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: '#FFFFFF',
      opacity: 0.8,
    },
    drawerContent: {
      flex: 1,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    footerButtonText: {
      marginLeft: 12,
      fontSize: 16,
      color: theme.colors.text,
    },
  });
  
  const getUserInitials = (email) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };
  
  const handleSignOut = async () => {
    try {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut();
              } catch (error) {
                Alert.alert(
                  'Sign Out Failed',
                  error.message,
                  [{ text: 'OK', style: 'default' }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  
  return (
    <ThemeAwareNavigationWrapper style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getUserInitials(user?.email)}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <ThemeAwareText style={styles.userName} colorKey="text" enableTransitions={false}>
              {user?.displayName || 'Hero'}
            </ThemeAwareText>
            <ThemeAwareText style={styles.userEmail} colorKey="text" enableTransitions={false}>
              {user?.email || 'hero@example.com'}
            </ThemeAwareText>
          </View>
        </View>
      </View>
      
      <DrawerContentScrollView {...props} style={styles.drawerContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      <View style={styles.footer}>
        <ThemeSwitcher style={{ marginBottom: 16 }} />
        
        <TouchableOpacity style={styles.footerButton} onPress={handleSignOut}>
          <Ionicons name={navigationIcons.close} size={24} color={theme.colors.text} />
          <ThemeAwareText style={styles.footerButtonText} colorKey="text">
            Sign Out
          </ThemeAwareText>
        </TouchableOpacity>
      </View>
    </ThemeAwareNavigationWrapper>
  );
}