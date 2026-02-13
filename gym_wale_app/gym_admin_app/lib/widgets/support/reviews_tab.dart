import 'package:flutter/material.dart';
import '../../models/support_models.dart';
import '../../services/support_service.dart';
import 'package:timeago/timeago.dart' as timeago;

class ReviewsTab extends StatefulWidget {
  final List<GymReview> reviews;
  final VoidCallback onRefresh;
  final SupportService supportService;

  const ReviewsTab({
    Key? key,
    required this.reviews,
    required this.onRefresh,
    required this.supportService,
  }) : super(key: key);

  @override
  State<ReviewsTab> createState() => _ReviewsTabState();
}

class _ReviewsTabState extends State<ReviewsTab> {
  String _searchQuery = '';
  String _filterRating = 'all'; // all, 5, 4, 3, 2, 1
  String _filterStatus = 'all'; // all, replied, pending

  List<GymReview> get _filteredReviews {
    return widget.reviews.where((review) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!review.userName.toLowerCase().contains(query) &&
            !review.comment.toLowerCase().contains(query)) {
          return false;
        }
      }

      // Rating filter
      if (_filterRating != 'all') {
        if (review.rating != int.parse(_filterRating)) {
          return false;
        }
      }

      // Status filter
      if (_filterStatus == 'replied' && review.adminReply == null) {
        return false;
      } else if (_filterStatus == 'pending' && review.adminReply != null) {
        return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search and Filters
        _buildSearchAndFilters(),
        // Reviews List
        Expanded(
          child: _filteredReviews.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: () async => widget.onRefresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredReviews.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      return _buildReviewCard(_filteredReviews[index]);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Column(
        children: [
          // Search bar
          TextField(
            decoration: InputDecoration(
              hintText: 'Search reviews by member name or comment...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
              });
            },
          ),
          const SizedBox(height: 12),
          // Filters
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _filterRating,
                  decoration: InputDecoration(
                    labelText: 'Rating',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All Ratings')),
                    DropdownMenuItem(value: '5', child: Text('5 Stars')),
                    DropdownMenuItem(value: '4', child: Text('4 Stars')),
                    DropdownMenuItem(value: '3', child: Text('3 Stars')),
                    DropdownMenuItem(value: '2', child: Text('2 Stars')),
                    DropdownMenuItem(value: '1', child: Text('1 Star')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _filterRating = value ?? 'all';
                    });
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _filterStatus,
                  decoration: InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All')),
                    DropdownMenuItem(value: 'replied', child: Text('Replied')),
                    DropdownMenuItem(value: 'pending', child: Text('Pending')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _filterStatus = value ?? 'all';
                    });
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReviewCard(GymReview review) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Member info and rating
            Row(
              children: [
                // User profile image
                CircleAvatar(
                  radius: 24,
                  backgroundImage: review.userImage != null && review.userImage!.isNotEmpty
                      ? NetworkImage(review.userImage!)
                      : null,
                  child: review.userImage == null || review.userImage!.isEmpty
                      ? Text(
                          review.userName.isNotEmpty
                              ? review.userName[0].toUpperCase()
                              : 'A',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              review.userName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          // Member badge
                          if (review.memberStatus == 'current-member')
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.green,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'MEMBER',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            )
                          else if (review.memberStatus == 'ex-member')
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'EX-MEMBER',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        timeago.format(review.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                _buildStarRating(review.rating),
              ],
            ),
            const SizedBox(height: 12),
            // Review comment
            Text(
              review.comment,
              style: const TextStyle(fontSize: 14),
            ),
            if (review.adminReply != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.blue[900]!.withValues(alpha: 0.3)
                      : Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        // Gym logo for admin reply
                        if (review.gymLogoUrl != null && review.gymLogoUrl!.isNotEmpty)
                          CircleAvatar(
                            radius: 12,
                            backgroundImage: NetworkImage(review.gymLogoUrl!),
                          )
                        else
                          const CircleAvatar(
                            radius: 12,
                            child: Icon(Icons.fitness_center, size: 14),
                          ),
                        const SizedBox(width: 8),
                        // Gym name or "Admin Reply"
                        Expanded(
                          child: Text(
                            review.gymName ?? 'Admin Reply',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                              fontSize: 14,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(review.adminReply!),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            // Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (review.isFeatured)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.amber[100],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.star, size: 14, color: Colors.amber),
                        SizedBox(width: 4),
                        Text(
                          'FEATURED',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber,
                          ),
                        ),
                      ],
                    ),
                  ),
                const Spacer(),
                TextButton.icon(
                  icon: Icon(review.isFeatured ? Icons.star : Icons.star_border),
                  label: Text(review.isFeatured ? 'Unfeature' : 'Feature'),
                  onPressed: () => _toggleFeature(review),
                ),
                if (review.adminReply == null)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.reply, size: 18),
                    label: const Text('Reply'),
                    onPressed: () => _showReplyDialog(review),
                  )
                else
                  TextButton.icon(
                    icon: const Icon(Icons.edit, size: 18),
                    label: const Text('Edit Reply'),
                    onPressed: () => _showReplyDialog(review),
                  ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _confirmDelete(review),
                  tooltip: 'Delete review',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStarRating(int rating) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        return Icon(
          index < rating ? Icons.star : Icons.star_border,
          color: Colors.amber,
          size: 20,
        );
      }),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.star_border, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 16),
          Text(
            'No reviews yet',
            style: TextStyle(
              fontSize: 16,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  void _showReplyDialog(GymReview review) {
    final TextEditingController controller = TextEditingController(
      text: review.adminReply ?? '',
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(review.adminReply == null ? 'Reply to Review' : 'Edit Reply'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Review by ${review.userName}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              review.comment,
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Your reply',
                hintText: 'Thank you for your feedback...',
                border: OutlineInputBorder(),
              ),
              maxLines: 4,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.trim().isNotEmpty) {
                try {
                  await widget.supportService.replyToReview(
                    review.id,
                    controller.text.trim(),
                  );
                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Reply sent successfully')),
                    );
                    widget.onRefresh();
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to send reply: $e')),
                    );
                  }
                }
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleFeature(GymReview review) async {
    try {
      await widget.supportService.toggleFeatureReview(review.id, !review.isFeatured);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              review.isFeatured
                  ? 'Review unfeatured successfully'
                  : 'Review featured successfully',
            ),
          ),
        );
        widget.onRefresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update review: $e')),
        );
      }
    }
  }

  void _confirmDelete(GymReview review) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Review'),
        content: Text(
          'Are you sure you want to delete this review by ${review.userName}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await widget.supportService.deleteReview(review.id);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Review deleted successfully')),
                  );
                  widget.onRefresh();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to delete review: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
