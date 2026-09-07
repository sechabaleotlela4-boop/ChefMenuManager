import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- CONTEXT ----------
const AppContext = React.createContext();

const AppProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const stored = await AsyncStorage.getItem('menuItems');
      if (stored) setItems(JSON.parse(stored));
    } catch (e) {}
  };

  const saveItems = async (newItems) => {
    try {
      await AsyncStorage.setItem('menuItems', JSON.stringify(newItems));
      setItems(newItems);
    } catch (e) {}
  };

  const addItem = (item) => {
    const newItem = { ...item, id: Date.now().toString(), isAvailable: true };
    saveItems([...items, newItem]);
  };

  const editItem = (id, updated) => {
    const newItems = items.map(item => (item.id === id ? { ...item, ...updated } : item));
    saveItems(newItems);
  };

  const deleteItem = (id) => {
    const newItems = items.filter(item => item.id !== id);
    saveItems(newItems);
    Alert.alert('🗑️ Deleted', 'Dish has been removed.');
  };

  const toggleAvailability = (id) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    saveItems(updated);
  };

  return (
    <AppContext.Provider value={{ items, addItem, editItem, deleteItem, toggleAvailability }}>
      {children}
    </AppContext.Provider>
  );
};

const useApp = () => React.useContext(AppContext);

// ---------- STATISTICS CARD ----------
const StatisticsCard = ({ items }) => {
  const total = items.length;
  if (total === 0) return null;
  const avgPrice = items.reduce((sum, i) => sum + parseFloat(i.price || 0), 0) / total;
  const courseCounts = items.reduce((acc, item) => {
    acc[item.course] = (acc[item.course] || 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>📊 Menu Overview</Text>
      <View style={styles.statRow}>
        <Text style={styles.statText}>Total: <Text style={styles.bold}>{total}</Text></Text>
        <Text style={styles.statText}>Avg: <Text style={styles.bold}>R{avgPrice.toFixed(2)}</Text></Text>
      </View>
      <View style={styles.courseTags}>
        {Object.entries(courseCounts).map(([course, count]) => (
          <View key={course} style={styles.tag}><Text style={styles.tagText}>{course}: {count}</Text></View>
        ))}
      </View>
    </View>
  );
};

// ---------- MENU ITEM CARD ----------
const MenuItemCard = ({ item, onEdit, onDelete, onToggleAvailability }) => {
  const imageUrl = item.imageUrl || `https://loremflickr.com/400/240/food?lock=${item.id}`;

  return (
    <View style={[styles.card, item.isAvailable && styles.cardAvailable]}>
      <Image source={{ uri: imageUrl }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.dishPrice}>R{item.price.toFixed(2)}</Text>
        </View>
        <Text style={styles.dishDesc} numberOfLines={2}>{item.description || 'A delicious dish'}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.leftFooter}>
            <Text style={styles.dishCourse}>{item.course}</Text>
            <TouchableOpacity onPress={onToggleAvailability} style={styles.availabilityBtn}>
              <Text style={[styles.availabilityText, item.isAvailable ? styles.availableText : styles.unavailableText]}>
                {item.isAvailable ? '✅ Available' : '⛔ Unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Text style={styles.actionText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: '#C2410C' }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

// ---------- ADD/EDIT DISH SCREEN ----------
const AddEditDishScreen = ({ editingItem, setEditingItem }) => {
  const { addItem, editItem } = useApp();
  const [name, setName] = useState(editingItem?.name || '');
  const [description, setDescription] = useState(editingItem?.description || '');
  const [course, setCourse] = useState(editingItem?.course || 'Starter');
  const [price, setPrice] = useState(editingItem?.price?.toString() || '');
  const [imageUrl, setImageUrl] = useState(editingItem?.imageUrl || '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setDescription(editingItem.description || '');
      setCourse(editingItem.course || 'Starter');
      setPrice(editingItem.price?.toString() || '');
      setImageUrl(editingItem.imageUrl || '');
    } else {
      setName('');
      setDescription('');
      setCourse('Starter');
      setPrice('');
      setImageUrl('');
    }
    setErrors({});
  }, [editingItem]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Dish name required.';
    if (!course) e.course = 'Select a course.';
    if (!price || isNaN(price) || parseFloat(price) <= 0) e.price = 'Enter a valid price.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      name: name.trim(),
      description: description.trim(),
      course,
      price: parseFloat(price),
      imageUrl: imageUrl.trim() || undefined,
    };
    if (editingItem) {
      editItem(editingItem.id, data);
      Alert.alert('✅ Success', `"${name}" updated!`);
      setEditingItem(null);
    } else {
      addItem(data);
      Alert.alert('✅ Success', `"${name}" added!`);
    }
    setName('');
    setDescription('');
    setCourse('Starter');
    setPrice('');
    setImageUrl('');
    setErrors({});
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingItem ? '✏️ Edit Dish' : '📝 New Dish'}</Text>

        <Text style={styles.label}>Dish Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Grilled Salmon" />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 80 }]} multiline value={description} onChangeText={setDescription} placeholder="Describe the dish..." />

        <Text style={styles.label}>Course *</Text>
        <View style={styles.courseRow}>
          {['Starter', 'Main Course', 'Dessert'].map(c => (
            <TouchableOpacity key={c} style={[styles.courseBtn, course === c && styles.courseActive]} onPress={() => setCourse(c)}>
              <Text style={[styles.courseText, course === c && styles.courseTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.course && <Text style={styles.error}>{errors.course}</Text>}

        <Text style={styles.label}>Price (ZAR) *</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="e.g. 89.00" />
        {errors.price && <Text style={styles.error}>{errors.price}</Text>}

        <Text style={styles.label}>Image URL (optional)</Text>
        <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="Paste your image URL" />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{editingItem ? '💾 Update Dish' : '➕ Add to Menu'}</Text>
        </TouchableOpacity>

        {editingItem && (
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#6B7280', marginTop: 10 }]} onPress={() => setEditingItem(null)}>
            <Text style={styles.submitText}>❌ Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

// ---------- ALL MENU SCREEN ----------
const AllMenuScreen = ({ setEditingItem, setActiveTab }) => {
  const { items, deleteItem, toggleAvailability } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredItems = useMemo(() => {
    let result = items;
    if (search.trim()) {
      result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filter !== 'All') {
      result = result.filter(i => i.course === filter);
    }
    return result;
  }, [items, search, filter]);

  // ---------- DELETE FUNCTION (GUARANTEED TO WORK) ----------
  const handleDelete = (id, name) => {
    // First alert: ask for confirmation
    Alert.alert(
      'Delete Dish',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            // This will run when user taps "Delete"
            deleteItem(id); // deleteItem already shows a second alert
          } 
        }
      ],
      { cancelable: true }
    );
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setActiveTab('add');
  };

  const clearFilters = () => { setSearch(''); setFilter('All'); };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatisticsCard items={items} />

      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search dishes..." value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.filterRow}>
        {['All', 'Starter', 'Main Course', 'Dessert'].map(c => (
          <TouchableOpacity key={c} style={[styles.filterBtn, filter === c && styles.filterActive]} onPress={() => setFilter(c)}>
            <Text style={[styles.filterText, filter === c && styles.filterTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
        {(search || filter !== 'All') && <TouchableOpacity onPress={clearFilters}><Text style={styles.clearText}>✕ Clear</Text></TouchableOpacity>}
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>No dishes found</Text>
          <Text style={styles.emptySub}>Add a new dish or adjust filters.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id, item.name)}
              onToggleAvailability={() => toggleAvailability(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

// ---------- AVAILABLE SCREEN ----------
const AvailableScreen = ({ setEditingItem, setActiveTab }) => {
  const { items, deleteItem, toggleAvailability } = useApp();

  const availableItems = useMemo(() => items.filter(item => item.isAvailable), [items]);

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Dish',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteItem(id) 
        }
      ]
    );
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setActiveTab('add');
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <View style={styles.availableHeader}>
        <Text style={styles.availableTitle}>✅ Available Dishes</Text>
        <Text style={styles.availableCount}>{availableItems.length} items</Text>
      </View>

      {availableItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🫙</Text>
          <Text style={styles.emptyTitle}>No available dishes</Text>
          <Text style={styles.emptySub}>Mark some dishes as available in the "All Menu" tab.</Text>
        </View>
      ) : (
        <FlatList
          data={availableItems}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id, item.name)}
              onToggleAvailability={() => toggleAvailability(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

// ---------- MAIN APP ----------
export default function MainApp() {
  const [activeTab, setActiveTab] = useState('all');
  const [editingItem, setEditingItem] = useState(null);

  return (
    <AppProvider>
      <SafeAreaView style={styles.mainContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👨‍🍳 Chef's Menu</Text>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.activeTab]} onPress={() => { setActiveTab('all'); setEditingItem(null); }}>
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>📋 All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'add' && styles.activeTab]} onPress={() => setActiveTab('add')}>
            <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>➕ {editingItem ? 'Edit' : 'Add'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.activeTab]} onPress={() => { setActiveTab('available'); setEditingItem(null); }}>
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>✅ Available</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'all' && <AllMenuScreen setEditingItem={setEditingItem} setActiveTab={setActiveTab} />}
        {activeTab === 'add' && <AddEditDishScreen editingItem={editingItem} setEditingItem={setEditingItem} />}
        {activeTab === 'available' && <AvailableScreen setEditingItem={setEditingItem} setActiveTab={setActiveTab} />}
      </SafeAreaView>
    </AppProvider>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF7ED' },
  header: {
    backgroundColor: '#1F2937',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF7ED',
    textAlign: 'center',
    letterSpacing: 1,
  },
  screenContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#FFF7ED' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 30,
    elevation: 4,
    overflow: 'hidden',
    shadowColor: '#1F2937',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#1F2937' },
  tabText: { fontWeight: '600', fontSize: 15, color: '#1F2937' },
  activeTabText: { color: '#FFF7ED' },

  formCard: { backgroundColor: '#FFF7ED', borderRadius: 20, padding: 20, marginTop: 8, shadowColor: '#1F2937', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  formTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginTop: 10 },
  input: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#D1D5DB', marginTop: 4 },
  error: { color: '#C2410C', fontSize: 13, marginTop: 2 },
  courseRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  courseBtn: { flex: 1, padding: 12, marginHorizontal: 4, borderRadius: 25, backgroundColor: '#F3F4F6', alignItems: 'center' },
  courseActive: { backgroundColor: '#1F2937' },
  courseText: { fontWeight: '600', color: '#1F2937' },
  courseTextActive: { color: '#FFF7ED' },
  submitBtn: { backgroundColor: '#16A34A', padding: 16, borderRadius: 30, marginTop: 20, alignItems: 'center' },
  submitText: { color: '#FFF7ED', fontSize: 18, fontWeight: 'bold' },

  statCard: { backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#D1D5DB' },
  statTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statText: { fontSize: 15, color: '#1F2937' },
  bold: { fontWeight: '700' },
  courseTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  tag: { backgroundColor: '#16A34A', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 25, marginRight: 6, marginTop: 4 },
  tagText: { color: '#FFF7ED', fontWeight: '600', fontSize: 12 },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 10, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8, fontSize: 18 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1F2937' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 4 },
  filterActive: { backgroundColor: '#1F2937' },
  filterText: { fontWeight: '600', color: '#1F2937' },
  filterTextActive: { color: '#FFF7ED' },
  clearText: { fontWeight: '600', color: '#C2410C' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 10 },
  emptySub: { fontSize: 16, color: '#6B7280', marginTop: 4 },

  card: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: '#1F2937',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardAvailable: { borderColor: '#16A34A', borderWidth: 2 },
  cardImage: { width: '100%', height: 180, backgroundColor: '#F3F4F6' },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 10 },
  dishPrice: { fontSize: 18, fontWeight: 'bold', color: '#C2410C' },
  dishDesc: { fontSize: 14, color: '#4B5563', marginVertical: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  leftFooter: { flexDirection: 'row', alignItems: 'center' },
  dishCourse: { fontSize: 13, fontWeight: '600', color: '#1F2937', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 25 },
  availabilityBtn: { marginLeft: 10 },
  availabilityText: { fontWeight: '600', fontSize: 12 },
  availableText: { color: '#16A34A' },
  unavailableText: { color: '#6B7280' },
  actions: { flexDirection: 'row' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  actionText: { fontSize: 18 },

  availableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  availableTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  availableCount: { fontSize: 16, color: '#6B7280' },
});