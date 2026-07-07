import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';

interface AddVillaScreenProps {
  navigation: any;
}

const AddVillaScreen: React.FC<AddVillaScreenProps> = ({ navigation }) => {
  const navController = useNavigation();
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Villa name is required');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Validation Error', 'Address is required');
      return false;
    }
    return true;
  };

  const handleAddVilla = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await apiService.createVilla({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        description: formData.description,
      });

      if (response) {
        Alert.alert('Success', 'Villa added successfully', [
          {
            text: 'OK',
            onPress: () => {
              navController.goBack();
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error adding villa:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to add villa. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navController.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme === 'dark' ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Villa</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Villa Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Villa Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter villa name"
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter villa address"
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city"
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            value={formData.city}
            onChangeText={(value) => handleInputChange('city', value)}
          />
        </View>

        {/* Country */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter country"
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            value={formData.country}
            onChangeText={(value) => handleInputChange('country', value)}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter villa description (optional)"
            placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navController.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleAddVilla}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Add Villa</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#F5F5F5',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? '#333' : '#E0E0E0',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme === 'dark' ? '#FFF' : '#000',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme === 'dark' ? '#FFF' : '#333',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#444' : '#E0E0E0',
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 14,
      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#FFFFFF',
      color: theme === 'dark' ? '#FFF' : '#000',
    },
    textArea: {
      textAlignVertical: 'top',
      minHeight: 80,
    },
    buttonGroup: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 30,
      marginBottom: 30,
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme === 'dark' ? '#444' : '#E0E0E0',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme === 'dark' ? '#FFF' : '#000',
    },
    submitButton: {
      backgroundColor: '#007AFF',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default AddVillaScreen;
