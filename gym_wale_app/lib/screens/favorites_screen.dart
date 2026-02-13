import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/gym.dart';
import '../widgets/gym_card.dart';
import '../l10n/app_localizations.dart';
import 'gym_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({Key? key}) : super(key: key);

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Gym> _favorites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    setState(() => _isLoading = true);

    try {
      final favorites = await ApiService.getFavorites();
      setState(() {
        _favorites = favorites;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.favorites),
            const SizedBox(width: 8),
            const Icon(Icons.favorite, size: 24),
          ],
        ),
        elevation: 0,
      ),
      body: Column(
        children: [

            // Favorites List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _favorites.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.favorite_border,
                                size: 64,
                                color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.5),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                l10n.noFavoritesYet,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                l10n.saveFavoriteGyms,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadFavorites,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _favorites.length,
                            itemBuilder: (context, index) {
                              return GymCard(
                                gym: _favorites[index],
                                onTap: () async {
                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => GymDetailScreen(
                                        gymId: _favorites[index].id,
                                      ),
                                    ),
                                  );
                                  _loadFavorites(); // Refresh in case favorite status changed
                                },
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      );
  }
}
