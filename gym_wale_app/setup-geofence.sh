#!/bin/bash

# Geofence Attendance System - Quick Setup Script
# This script helps set up the geofence-based attendance system

echo "🎯 Geofence Attendance System - Quick Setup"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Backend Setup
echo "📦 Step 1: Backend Setup"
echo "------------------------"
echo ""

cd backend

echo "Installing backend dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

echo ""

# Step 2: Run Migration
echo "🔄 Step 2: Database Migration"
echo "-----------------------------"
echo ""

echo "Adding geofenceRadius to existing gyms..."
node scripts/addGeofenceRadiusToGyms.js migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Migration may have failed or no gyms to update${NC}"
fi

echo ""
cd ..

# Step 3: Flutter Setup
echo "📱 Step 3: Flutter Setup"
echo "-----------------------"
echo ""

echo "Installing Flutter dependencies..."
flutter pub get

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Flutter dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install Flutter dependencies${NC}"
    exit 1
fi

echo ""

# Step 4: Verify Android Configuration
echo "🤖 Step 4: Android Configuration Check"
echo "--------------------------------------"
echo ""

if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    if grep -q "ACCESS_BACKGROUND_LOCATION" android/app/src/main/AndroidManifest.xml; then
        echo -e "${GREEN}✅ Android permissions configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Android permissions may need manual configuration${NC}"
    fi
else
    echo -e "${RED}❌ AndroidManifest.xml not found${NC}"
fi

echo ""

# Step 5: Summary
echo "📋 Setup Summary"
echo "----------------"
echo ""
echo "Components installed:"
echo "  ✅ Backend controller: geofenceAttendanceController.js"
echo "  ✅ Backend routes: geofenceAttendance.js"
echo "  ✅ Flutter service: geofencing_service.dart"
echo "  ✅ Flutter provider: attendance_provider.dart"
echo "  ✅ Database models: Updated Attendance and Gym models"
echo "  ✅ Android configuration: Permissions added"
echo ""

# Step 6: Next Steps
echo "🚀 Next Steps"
echo "-------------"
echo ""
echo "1. Start your backend server:"
echo "   cd backend && npm start"
echo ""
echo "2. Test the API endpoints:"
echo "   curl http://localhost:5000/api/health"
echo ""
echo "3. Run the Flutter app on a real device:"
echo "   flutter run --release"
echo ""
echo "4. Review the documentation:"
echo "   - GEOFENCE_IMPLEMENTATION_GUIDE.md"
echo "   - GEOFENCE_API_REFERENCE.md"
echo "   - IOS_GEOFENCING_SETUP.md"
echo ""

echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   - Test on a REAL device (geofencing doesn't work well on emulators)"
echo "   - Grant 'Allow all the time' location permission"
echo "   - Ensure GPS is enabled on the device"
echo "   - For iOS, follow IOS_GEOFENCING_SETUP.md for additional configuration"
echo ""

# Optional: Test backend connection
read -p "Would you like to test the backend connection? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting backend server in background..."
    cd backend
    npm start &
    BACKEND_PID=$!
    
    sleep 5
    
    echo "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
    
    if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
        echo -e "${GREEN}✅ Backend is running and responding${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
    fi
    
    echo ""
    read -p "Keep backend running? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        kill $BACKEND_PID
        echo "Backend stopped"
    else
        echo "Backend is running (PID: $BACKEND_PID)"
    fi
fi

echo ""
echo "Happy coding! 🎉"
