import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import MapScreen from './screens/MapScreen';
import PastJourneysScreen from './screens/PastJourneysScreen';
import DiscoveriesScreen from './screens/DiscoveriesScreen';
import SocialScreen from './screens/SocialScreen';
import SettingsScreen from './screens/SettingsScreen';

const Drawer = createDrawerNavigator();

export default function App() {
 return (
   <GestureHandlerRootView style={{ flex: 1 }}>
     <NavigationContainer>
       <Drawer.Navigator initialRouteName="Map">
         <Drawer.Screen name="Map" component={MapScreen} />
         <Drawer.Screen name="Past Journeys" component={PastJourneysScreen} />
         <Drawer.Screen name="Discoveries" component={DiscoveriesScreen} />
         <Drawer.Screen name="Social" component={SocialScreen} />
         <Drawer.Screen name="Settings" component={SettingsScreen} />
       </Drawer.Navigator>
     </NavigationContainer>
   </GestureHandlerRootView>
 );
}