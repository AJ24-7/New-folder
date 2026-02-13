import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/trainer.dart';
import '../config/app_theme.dart';

class TrainersScreen extends StatefulWidget {
  const TrainersScreen({Key? key}) : super(key: key);

  @override
  State<TrainersScreen> createState() => _TrainersScreenState();
}

class _TrainersScreenState extends State<TrainersScreen> {
  final _searchController = TextEditingController();
  List<Trainer> _trainers = [];
  List<Trainer> _filteredTrainers = [];
  bool _isLoading = true;
  String _selectedFilter = 'All';
  String? _selectedSpecialty;

  final List<String> _specialties = [
    'All',
    'Personal Training',
    'Yoga',
    'CrossFit',
    'Pilates',
    'Martial Arts',
    'Cardio',
    'Strength Training',
    'Nutrition',
    'Sports Training',
  ];

  @override
  void initState() {
    super.initState();
    _loadTrainers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTrainers() async {
    setState(() => _isLoading = true);
    
    try {
      final trainersData = await ApiService.getTrainers();
      
      if (mounted) {
        setState(() {
          _trainers = trainersData
              .map((data) => Trainer.fromJson(data))
              .toList();
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error loading trainers: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load trainers: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredTrainers = _trainers.where((trainer) {
        // Search filter
        bool matchesSearch = _searchController.text.isEmpty ||
            trainer.fullName.toLowerCase().contains(_searchController.text.toLowerCase()) ||
            trainer.specialty.toLowerCase().contains(_searchController.text.toLowerCase());
        
        // Specialty filter
        bool matchesSpecialty = _selectedSpecialty == null ||
            _selectedSpecialty == 'All' ||
            trainer.specialty.toLowerCase() == _selectedSpecialty?.toLowerCase();
        
        return matchesSearch && matchesSpecialty;
      }).toList();
      
      // Apply sort
      _sortTrainers(_selectedFilter);
    });
  }

  void _sortTrainers(String sortType) {
    setState(() {
      _selectedFilter = sortType;
      switch (sortType) {
        case 'Rating':
          _filteredTrainers.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
          break;
        case 'Experience':
          _filteredTrainers.sort((a, b) => b.experience.compareTo(a.experience));
          break;
        case 'Name':
          _filteredTrainers.sort((a, b) => a.fullName.compareTo(b.fullName));
          break;
        default:
          _filteredTrainers = List.from(_trainers);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Sort Button Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF1E1E1E)
                : Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Find Trainers',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.sort),
                onSelected: _sortTrainers,
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'All', child: Text('All')),
                  const PopupMenuItem(value: 'Rating', child: Text('Highest Rated')),
                  const PopupMenuItem(value: 'Experience', child: Text('Most Experienced')),
                  const PopupMenuItem(value: 'Name', child: Text('Name (A-Z)')),
                ],
              ),
            ],
          ),
        ),
          // Search Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF1E1E1E)
                  : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: TextField(
              controller: _searchController,
              style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color),
              decoration: InputDecoration(
                hintText: 'Search trainers...',
                hintStyle: TextStyle(color: Theme.of(context).textTheme.bodyMedium?.color),
                prefixIcon: Icon(Icons.search, color: Theme.of(context).iconTheme.color),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.clear, color: Theme.of(context).iconTheme.color),
                        onPressed: () {
                          _searchController.clear();
                          _applyFilters();
                        },
                      )
                    : null,
                filled: true,
                fillColor: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF2C2C2C)
                    : AppTheme.backgroundColor,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (val) => _applyFilters(),
            ),
          ),
          
          // Specialty Filter Chips
          Container(
            height: 50,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _specialties.length,
              itemBuilder: (context, index) {
                final specialty = _specialties[index];
                final isSelected = _selectedSpecialty == specialty || 
                    (_selectedSpecialty == null && specialty == 'All');
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(specialty),
                    selected: isSelected,
                    onSelected: (_) {
                      setState(() {
                        _selectedSpecialty = specialty == 'All' ? null : specialty;
                      });
                      _applyFilters();
                    },
                    backgroundColor: AppTheme.backgroundColor,
                    selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                    checkmarkColor: AppTheme.primaryColor,
                    labelStyle: TextStyle(
                      color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      fontSize: 12,
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Trainers List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredTrainers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.person_off_outlined,
                              size: 64,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No Trainers Found',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Try adjusting your search or filters',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadTrainers,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredTrainers.length,
                          itemBuilder: (context, index) {
                            return _buildTrainerCard(_filteredTrainers[index]);
                          },
                        ),
                      ),
          ),
        ],
      );
  }

  Widget _buildTrainerCard(Trainer trainer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () {
          // TODO: Navigate to trainer detail screen
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Trainer details for ${trainer.fullName} coming soon!'),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Trainer Image
              CircleAvatar(
                radius: 35,
                backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                backgroundImage: trainer.photo != null
                    ? NetworkImage(trainer.photo!)
                    : null,
                child: trainer.photo == null
                    ? Icon(
                        Icons.person,
                        size: 35,
                        color: AppTheme.primaryColor,
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              
              // Trainer Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trainer.fullName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (trainer.specialty.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.fitness_center,
                            size: 14,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              trainer.specialty,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (trainer.experience > 0) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.work_outline,
                            size: 14,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            trainer.experienceText,
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        // Rating
                        Icon(
                          Icons.star,
                          size: 16,
                          color: Colors.amber,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          trainer.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 16),
                        
                        // Rate Display
                        if (trainer.hourlyRate != null || trainer.monthlyRate != null)
                          Expanded(
                            child: Text(
                              _getRateDisplay(trainer),
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Arrow Icon
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: AppTheme.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getRateDisplay(Trainer trainer) {
    final parts = <String>[];
    if (trainer.hourlyRate != null) {
      parts.add('₹${trainer.hourlyRate!.toStringAsFixed(0)}/hr');
    }
    if (trainer.monthlyRate != null) {
      parts.add('₹${trainer.monthlyRate!.toStringAsFixed(0)}/mo');
    }
    return parts.join(' • ');
  }
}
