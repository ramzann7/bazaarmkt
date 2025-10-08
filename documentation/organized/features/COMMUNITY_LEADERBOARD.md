# Community Engagement Leaderboard

## Overview
The Community Engagement Leaderboard showcases the most active and engaged artisans on the platform, encouraging community participation and giving visibility to artisans who actively contribute to the community through posts, engagement, and interaction.

## Features

### 1. Engagement Scoring System
Artisans are ranked based on a comprehensive engagement score that rewards different types of community participation:

**Point System:**
- **Posts**: 10 points each
- **Likes Received**: 2 points each
- **Comments Made**: 5 points each

**Formula:**
```
Engagement Score = (Posts × 10) + (Likes Received × 2) + (Comments Made × 5)
```

This weighted system encourages:
- Creating valuable content (posts)
- Getting community appreciation (likes)
- Participating in discussions (comments)

### 2. Real-Time Calculation
The leaderboard is calculated in real-time from the database, ensuring:
- Up-to-date rankings
- No need for manual updates
- Accurate reflection of current engagement

### 3. Frontend Display
The leaderboard appears on the Community page's sidebar showing:
- Top 5 engaged artisans
- Artisan name and type
- Visual ranking (1st, 2nd, 3rd get special badges)
- Clickable links to artisan shops
- Empty state for new platforms

## API Endpoints

### GET /api/community/leaderboard/engagement
Returns the engagement leaderboard for artisans.

**Query Parameters:**
- `limit` (optional, default: 10) - Maximum number of artisans to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "artisan_id",
      "artisanName": "Ramzan's Bakery",
      "type": "food_beverages",
      "engagementScore": 31,
      "postsCount": 2,
      "likesCount": 3,
      "commentsCount": 1,
      "user": {
        "_id": "user_id",
        "firstName": "Ramzan",
        "lastName": "Ali",
        "profilePicture": null
      }
    }
  ],
  "count": 2
}
```

### GET /api/community/leaderboard
Alternative endpoint that returns the same data.

## Database Schema

### Collections Used

**communityposts**
- Contains posts created by artisans
- `artisan` field links to artisans collection
- `likes` array contains embedded like objects

**communitycomments**
- Contains comments made by artisans
- `artisan` field links to artisans collection (null for patrons)

**artisans**
- Main artisan profiles
- `user` field links to users collection

## Implementation Details

### Backend Logic
The leaderboard uses MongoDB aggregation pipeline:

1. **Lookup Posts**: Join artisans with their community posts
2. **Lookup Comments**: Join artisans with their comments
3. **Calculate Likes**: Reduce operation to count all likes from posts
4. **Calculate Score**: Apply weighted formula
5. **Filter**: Only include artisans with score > 0
6. **Sort**: Order by engagement score descending
7. **Limit**: Return top N artisans
8. **Populate User**: Add user information for display

### Frontend Integration
The frontend:
- Loads leaderboard on component mount
- Displays top 5 artisans in sidebar
- Links to artisan shops for navigation
- Shows empty state when no data

## Benefits

### For Artisans
- **Visibility**: Get featured on the community page
- **Recognition**: Reward for active participation
- **Traffic**: Click-through to their shops
- **Motivation**: Gamification encourages engagement

### For Patrons
- **Discovery**: Find active artisans to support
- **Quality Signal**: Engaged artisans often provide better service
- **Community Connection**: See who's most involved

### For Platform
- **Engagement**: Encourages artisan participation
- **Content**: More posts and comments
- **Community Building**: Fosters connections
- **Retention**: Active artisans stay longer

## Example Scenarios

### Scenario 1: New Artisan
A new artisan joins and creates their first post:
- Score: 10 (1 post × 10)
- Appears on leaderboard if no other artisans exist

### Scenario 2: Active Community Member
An artisan who:
- Creates 5 posts (50 points)
- Receives 20 likes (40 points)
- Makes 10 comments (50 points)
- **Total Score**: 140 points

### Scenario 3: Viral Post
An artisan creates 1 post that gets 50 likes:
- Posts: 10 points
- Likes: 100 points
- **Total Score**: 110 points (showing quality over quantity)

## Future Enhancements

### Potential Additions
1. **Time-Based Filtering**: Weekly, monthly leaderboards
2. **Category Leaderboards**: Top artisan per category
3. **Badges**: Visual badges for top performers
4. **Rewards**: Discount codes or featured placements
5. **Trending**: Show fastest-growing artisans
6. **History**: Track score changes over time

### Analytics Integration
- Track leaderboard views
- Measure click-through to artisan shops
- Correlate engagement with sales

## Monitoring

### Key Metrics to Track
- Number of artisans on leaderboard
- Average engagement score
- Distribution of points (posts vs likes vs comments)
- Leaderboard turnover rate
- Click-through rate to artisan shops

## Testing

### Manual Testing
1. Create posts as artisan
2. Like posts as patron
3. Comment on posts
4. Check leaderboard updates
5. Verify score calculations

### Automated Testing
```bash
# Test endpoint
curl -s "http://localhost:4000/api/community/leaderboard/engagement" | jq '.data[] | {name: .artisanName, score: .engagementScore}'
```

## Deployment Notes

- No database migrations required
- Real-time calculation (no cron jobs needed)
- Works with existing community posts/comments
- Backward compatible

## Support

For questions or issues with the leaderboard feature:
1. Check engagement score calculations
2. Verify artisan has posts/comments
3. Ensure community posts are published
4. Check database connections

---

**Last Updated**: October 2, 2025
**Version**: 1.0
**Status**: Production Ready ✅

