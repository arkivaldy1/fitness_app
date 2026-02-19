import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, NumericInput } from '../../../components/ui';
import { useAuthStore, useNutritionStore } from '../../../stores';
import { searchFoods, FoodSearchResult } from '../../../lib/foodSearch';
import {
  getMealTemplates,
  saveMealTemplate,
  deleteMealTemplate,
  incrementMealTemplateUseCount,
} from '../../../lib/database';
import { theme } from '../../../constants/theme';
import type { MealTemplate } from '../../../types';

type Tab = 'search' | 'myfoods' | 'manual';

export default function AddNutritionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { day, addEntry } = useNutritionStore();

  const [activeTab, setActiveTab] = useState<Tab>('manual');

  // Form state
  const [label, setLabel] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [saveToMyFoods, setSaveToMyFoods] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // My Foods state
  const [myFoods, setMyFoods] = useState<MealTemplate[]>([]);
  const [isLoadingMyFoods, setIsLoadingMyFoods] = useState(false);

  // Load My Foods when tab opens
  useEffect(() => {
    if (activeTab === 'myfoods' && user) {
      loadMyFoods();
    }
  }, [activeTab, user]);

  const loadMyFoods = async () => {
    if (!user) return;
    setIsLoadingMyFoods(true);
    const templates = await getMealTemplates(user.id);
    setMyFoods(templates);
    setIsLoadingMyFoods(false);
  };

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer) clearTimeout(searchTimer);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchFoods(text);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);

    setSearchTimer(timer);
  }, [searchTimer]);

  const fillFromResult = (result: FoodSearchResult) => {
    setLabel(result.name);
    setCalories(result.calories);
    setProtein(Math.round(result.protein));
    setCarbs(Math.round(result.carbs));
    setFat(Math.round(result.fat));
    setActiveTab('manual'); // Switch to manual tab to review/adjust
  };

  const fillFromTemplate = async (template: MealTemplate) => {
    setLabel(template.name);
    setCalories(template.calories);
    setProtein(Math.round(template.protein || 0));
    setCarbs(Math.round(template.carbs || 0));
    setFat(Math.round(template.fat || 0));
    await incrementMealTemplateUseCount(template.id);
    setActiveTab('manual');
  };

  const handleDeleteMyFood = (template: MealTemplate) => {
    Alert.alert(
      'Delete Food',
      `Remove "${template.name}" from My Foods?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMealTemplate(template.id);
            await loadMyFoods();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user || !day || calories === 0) return;
    setIsSaving(true);

    await addEntry({
      user_id: user.id,
      label: label || null,
      calories,
      protein,
      carbs,
      fat,
      water_ml: 0,
      meal_template_id: null,
    });

    if (saveToMyFoods && label) {
      await saveMealTemplate(user.id, label, calories, protein, carbs, fat);
    }

    router.back();
  };

  const canSave = calories > 0;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tabs */}
        <View style={styles.tabs}>
          {(['search', 'myfoods', 'manual'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'search' ? 'Search' : tab === 'myfoods' ? 'My Foods' : 'Manual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Tab */}
          {activeTab === 'search' && (
            <View>
              <View style={styles.searchBox}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search foods (e.g., banana, chicken...)"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  autoFocus
                  returnKeyType="search"
                />
              </View>

              {isSearching && (
                <View style={styles.searchLoading}>
                  <ActivityIndicator color="#059669" />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              )}

              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <View style={styles.searchEmpty}>
                  <Text style={styles.searchEmptyText}>No results found</Text>
                  <Text style={styles.searchEmptySubtext}>Try a different search term or add manually</Text>
                </View>
              )}

              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={`${result.name}-${index}`}
                  style={styles.resultItem}
                  onPress={() => fillFromResult(result)}
                >
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
                    <Text style={styles.resultMacros}>
                      P: {result.protein}g · C: {result.carbs}g · F: {result.fat}g
                    </Text>
                    <Text style={styles.resultServing}>per {result.servingSize}</Text>
                  </View>
                  <View style={styles.resultCalBadge}>
                    <Text style={styles.resultCal}>{result.calories}</Text>
                    <Text style={styles.resultCalUnit}>kcal</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* My Foods Tab */}
          {activeTab === 'myfoods' && (
            <View>
              {isLoadingMyFoods ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator color="#059669" />
                </View>
              ) : myFoods.length === 0 ? (
                <View style={styles.searchEmpty}>
                  <Text style={styles.myFoodsEmptyEmoji}>*</Text>
                  <Text style={styles.searchEmptyText}>No saved foods yet</Text>
                  <Text style={styles.searchEmptySubtext}>
                    When logging food, toggle "Save to My Foods" to save it here for quick access
                  </Text>
                </View>
              ) : (
                myFoods.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.resultItem}
                    onPress={() => fillFromTemplate(template)}
                    onLongPress={() => handleDeleteMyFood(template)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={1}>{template.name}</Text>
                      <Text style={styles.resultMacros}>
                        P: {template.protein || 0}g · C: {template.carbs || 0}g · F: {template.fat || 0}g
                      </Text>
                      {template.use_count > 0 && (
                        <Text style={styles.resultServing}>Used {template.use_count}x</Text>
                      )}
                    </View>
                    <View style={styles.resultCalBadge}>
                      <Text style={styles.resultCal}>{template.calories}</Text>
                      <Text style={styles.resultCalUnit}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
              {myFoods.length > 0 && (
                <Text style={styles.myFoodsHint}>Long press to delete</Text>
              )}
            </View>
          )}

          {/* Manual Tab */}
          {activeTab === 'manual' && (
            <View>
              <View style={styles.labelRow}>
                <TextInput
                  style={styles.labelInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Food name (optional)"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.macroGrid}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <NumericInput
                    value={calories}
                    onChange={setCalories}
                    min={0}
                    max={5000}
                    step={10}
                    unit="kcal"
                  />
                </View>

                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <NumericInput
                    value={protein}
                    onChange={setProtein}
                    min={0}
                    max={500}
                    step={1}
                    unit="g"
                  />
                </View>

                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <NumericInput
                    value={carbs}
                    onChange={setCarbs}
                    min={0}
                    max={500}
                    step={1}
                    unit="g"
                  />
                </View>

                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <NumericInput
                    value={fat}
                    onChange={setFat}
                    min={0}
                    max={500}
                    step={1}
                    unit="g"
                  />
                </View>
              </View>

              {/* Calculated check */}
              {calories > 0 && (
                <View style={styles.calculatedContainer}>
                  <Text style={styles.calculatedLabel}>Calculated from macros:</Text>
                  <Text style={styles.calculatedValue}>
                    {protein * 4 + carbs * 4 + fat * 9} kcal
                  </Text>
                  {Math.abs(calories - (protein * 4 + carbs * 4 + fat * 9)) > 50 && (
                    <Text style={styles.calculatedWarning}>
                      Note: This differs from entered calories
                    </Text>
                  )}
                </View>
              )}

              {/* Save to My Foods */}
              <View style={styles.saveToggle}>
                <Text style={styles.saveToggleLabel}>Save to My Foods</Text>
                <Switch
                  value={saveToMyFoods}
                  onValueChange={setSaveToMyFoods}
                  trackColor={{ false: '#e2e8f0', true: '#4CFCAD' }}
                  thumbColor="#fff"
                />
              </View>

              {/* Quick presets */}
              <View style={styles.presets}>
                <Text style={styles.presetsTitle}>Quick Add</Text>
                <View style={styles.presetButtons}>
                  {PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={styles.presetChip}
                      onPress={() => {
                        setLabel(preset.label);
                        setCalories(preset.calories);
                        setProtein(preset.protein);
                        setCarbs(preset.carbs);
                        setFat(preset.fat);
                      }}
                    >
                      <LinearGradient
                        colors={['rgba(76, 252, 173, 0.1)', 'rgba(76, 208, 252, 0.1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.presetChipInner}
                      >
                        <Text style={styles.presetChipLabel}>{preset.label}</Text>
                        <Text style={styles.presetChipCal}>{preset.calories} kcal</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer - only show on manual tab when there's data */}
        {activeTab === 'manual' && (
          <View style={styles.footer}>
            <Button
              title="Add Entry"
              onPress={handleSave}
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canSave}
              loading={isSaving}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRESETS = [
  { label: 'Protein Shake', calories: 150, protein: 30, carbs: 5, fat: 2 },
  { label: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
  { label: 'Rice (1 cup)', calories: 205, protein: 4, carbs: 45, fat: 0 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  // Search
  searchBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 16,
    color: theme.colors.text,
    padding: 14,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  searchEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  searchEmptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  myFoodsEmptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
    color: theme.colors.textMuted,
  },
  myFoodsHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
  // Result items (shared by search and my foods)
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  resultMacros: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  resultServing: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  resultCalBadge: {
    alignItems: 'flex-end',
  },
  resultCal: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  resultCalUnit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  // Manual tab
  labelRow: {
    marginBottom: 16,
  },
  labelInput: {
    fontSize: 16,
    color: theme.colors.text,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  macroGrid: {
    gap: theme.spacing.lg,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  calculatedContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  calculatedLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  calculatedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
  },
  calculatedWarning: {
    fontSize: 12,
    color: theme.colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },
  saveToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  presets: {
    marginTop: theme.spacing.xl,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  presetButtons: {
    gap: 8,
  },
  presetChip: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  presetChipInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.25)',
  },
  presetChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  presetChipCal: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
