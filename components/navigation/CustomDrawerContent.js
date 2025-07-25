import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Custom drawer content with user profile and navigation items
 */
export function CustomDrawerContent(props) {
  const { theme } = useTheme();
  const { user } = useUser();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      backgroundColor: theme.colors.primary,
      padding: 20,
      paddingTop: 50,
      marginBottom: 10,
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
  
  const handleSignOut = () => {
    // This will be implemented when authentication is added
    console.log('Sign out pressed');
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getUserInitials(user?.email)}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user?.displayName || 'Hero'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'hero@example.com'}
            </Text>
          </View>
        </View>
      </View>
      
      <DrawerContentScrollView {...props} style={styles.drawerContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.text} />
          <Text style={styles.footerButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}