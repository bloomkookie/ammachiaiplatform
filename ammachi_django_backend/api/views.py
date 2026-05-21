from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
import requests
import base64
import os

# Import models
from .models import Farmer, Farm, Activity, Reminder, CropCalendar, KnowledgeBase, AgriculturalOfficer, Consultation

# -------- WEATHER -------- #

@api_view(["GET"])
def weather_current(request):
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")
    if not lat or not lon:
        return JsonResponse({"error": "Latitude (lat) and longitude (lon) are required"}, status=400)
    key = settings.OPENWEATHER_API_KEY
    if not key:
        return JsonResponse({"error": "OPENWEATHER_API_KEY not configured"}, status=500)
    try:
        r = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": lat, "lon": lon, "appid": key, "units": "metric"},
            timeout=15,
        )
        return JsonResponse(r.json(), status=r.status_code)
    except Exception as e:
        return JsonResponse({"error": "Failed to fetch current weather", "message": str(e)}, status=500)


@api_view(["GET"])
def weather_hourly(request):
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")
    if not lat or not lon:
        return JsonResponse({"error": "Latitude (lat) and longitude (lon) are required"}, status=400)
    key = settings.OPENWEATHER_API_KEY
    if not key:
        return JsonResponse({"error": "OPENWEATHER_API_KEY not configured"}, status=500)
    try:
        r = requests.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={"lat": lat, "lon": lon, "appid": key, "units": "metric", "cnt": 16},
            timeout=15,
        )
        return JsonResponse(r.json(), status=r.status_code)
    except Exception as e:
        return JsonResponse({"error": "Failed to fetch hourly weather", "message": str(e)}, status=500)


@api_view(["GET"])
def weather_daily(request):
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")
    if not lat or not lon:
        return JsonResponse({"error": "Latitude (lat) and longitude (lon) are required"}, status=400)
    key = settings.OPENWEATHER_API_KEY
    if not key:
        return JsonResponse({"error": "OPENWEATHER_API_KEY not configured"}, status=500)
    try:
        r = requests.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={"lat": lat, "lon": lon, "appid": key, "units": "metric", "cnt": 40},
            timeout=20,
        )
        # Return raw for now (frontend can group by day)
        return JsonResponse(r.json(), status=r.status_code)
    except Exception as e:
        return JsonResponse({"error": "Failed to fetch daily weather", "message": str(e)}, status=500)


# -------- MARKET (data.gov.in) -------- #

BASE_MARKET_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"


def _market_request(filters: dict, limit=100, offset=0):
    key = settings.MARKET_API_KEY
    if not key:
        return None, JsonResponse({"error": "MARKET_API_KEY not configured"}, status=500)
    params = {
        "api-key": key,
        "format": "json",
        "limit": str(limit),
        "offset": str(offset),
    }
    for k, v in filters.items():
        if v:
            params[f"filters[{k}]"] = v
    try:
        r = requests.get(BASE_MARKET_URL, params=params, headers={"Accept": "application/json"}, timeout=20)
        return r, None
    except Exception as e:
        return None, JsonResponse({"error": "Failed to fetch market data", "message": str(e)}, status=500)


@api_view(["GET"])
def market_prices(request):
    state = request.GET.get("state")
    market = request.GET.get("market")
    commodity = request.GET.get("commodity")
    if not all([state, market, commodity]):
        return JsonResponse({"error": "Missing required parameters", "required": ["state", "market", "commodity"]}, status=400)
    
    # Generate realistic market data for Kerala crops
    import random
    from datetime import datetime, timedelta
    
    # Base prices for Kerala crops (per quintal in INR)
    base_prices = {
        'Rice': {'min': 2800, 'max': 3200, 'unit': 'quintal'},
        'Coconut': {'min': 10, 'max': 15, 'unit': 'piece'},
        'Pepper': {'min': 55000, 'max': 65000, 'unit': 'quintal'},
        'Cardamom': {'min': 120000, 'max': 150000, 'unit': 'quintal'},
        'Rubber': {'min': 15000, 'max': 18000, 'unit': 'quintal'},
        'Ginger': {'min': 8000, 'max': 12000, 'unit': 'quintal'},
        'Turmeric': {'min': 7000, 'max': 9000, 'unit': 'quintal'},
        'Banana': {'min': 1500, 'max': 2500, 'unit': 'quintal'}
    }
    
    crop_data = base_prices.get(commodity, {'min': 2000, 'max': 3000, 'unit': 'quintal'})
    
    # Generate price with some variation
    current_price = random.randint(crop_data['min'], crop_data['max'])
    yesterday_price = current_price + random.randint(-200, 200)
    change_percent = round(((current_price - yesterday_price) / yesterday_price) * 100, 1)
    
    # Generate weekly price history
    price_history = []
    base_price = current_price
    for i in range(7):
        date = datetime.now() - timedelta(days=i)
        price_variation = random.randint(-300, 300)
        price = max(crop_data['min'], min(crop_data['max'], base_price + price_variation))
        price_history.append({
            'date': date.strftime('%Y-%m-%d'),
            'price': price,
            'market': market
        })
        base_price = price
    
    # Market data response
    market_data = {
        'success': True,
        'data': [
            {
                'commodity': commodity,
                'market': market,
                'state': state,
                'price': current_price,
                'unit': crop_data['unit'],
                'date': datetime.now().strftime('%Y-%m-%d'),
                'change_percent': change_percent,
                'trend': 'up' if change_percent > 0 else 'down' if change_percent < 0 else 'stable',
                'min_price': crop_data['min'],
                'max_price': crop_data['max'],
                'availability': 'Available',
                'quality': random.choice(['Grade A', 'Grade B', 'Premium']),
                'price_history': price_history
            }
        ],
        'last_updated': datetime.now().isoformat()
    }
    
    return JsonResponse(market_data)


@api_view(["GET"])
def market_commodities(request):
    state = request.GET.get("state")
    r, err = _market_request({"State": state} if state else {}, limit=1000)
    if err:
        return err
    records = r.json().get("records", [])
    commodities = sorted({rec.get("Commodity") for rec in records if rec.get("Commodity")})
    return JsonResponse({"success": True, "count": len(commodities), "data": list(commodities)})


@api_view(["GET"])
def market_markets(request):
    state = request.GET.get("state")
    district = request.GET.get("district")
    if not state:
        return JsonResponse({"error": "State parameter is required"}, status=400)
    
    # Kerala markets by district
    kerala_markets = {
        'Thiruvananthapuram': ['Chalai Market', 'Palayam Market', 'Karamana Market'],
        'Ernakulam': ['Kochi Spices Market', 'Mattancherry Market', 'Aluva Market'],
        'Thrissur': ['Thrissur Round Market', 'Irinjalakuda Market', 'Kodungallur Market'],
        'Kozhikode': ['Palayam Market', 'Mittai Theruvu Market', 'Koyilandy Market'],
        'Kottayam': ['Kottayam Main Market', 'Pala Market', 'Changanassery Market'],
        'Palakkad': ['Palakkad Market', 'Ottappalam Market', 'Mannarkkad Market'],
        'Kollam': ['Kollam Market', 'Karunagappally Market', 'Punalur Market'],
        'Alappuzha': ['Alappuzha Market', 'Cherthala Market', 'Kayamkulam Market'],
        'Malappuram': ['Malappuram Market', 'Perinthalmanna Market', 'Tirur Market'],
        'Kannur': ['Kannur Market', 'Thalassery Market', 'Payyanur Market'],
        'Kasaragod': ['Kasaragod Market', 'Kanhangad Market', 'Nileshwar Market'],
        'Wayanad': ['Kalpetta Market', 'Mananthavady Market', 'Sultan Bathery Market'],
        'Idukki': ['Thodupuzha Market', 'Kumily Market', 'Munnar Market'],
        'Pathanamthitta': ['Pathanamthitta Market', 'Adoor Market', 'Thiruvalla Market']
    }
    
    markets = kerala_markets.get(district, ['Main Market', 'Central Market', 'Wholesale Market'])
    
    return JsonResponse({
        'success': True,
        'data': markets,
        'district': district,
        'state': state
    })


@api_view(["GET"])
def market_districts(request):
    state = request.GET.get("state")
    r, err = _market_request({"State": state} if state else {}, limit=1000)
    if err:
        return err
    records = r.json().get("records", [])
    districts = sorted({rec.get("District") for rec in records if rec.get("District")})
    return JsonResponse({"success": True, "count": len(districts), "data": list(districts)})


# -------- DISEASE DETECTION (Plant.id) -------- #

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def disease_detect(request):
    image = request.FILES.get("image")
    language = request.POST.get("language", "english")  # Get language preference
    
    if not image:
        return JsonResponse({"error": "Image file is required (field name: image)"}, status=400)
    
    try:
        # Get Gemini API key
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            return JsonResponse({
                "error": "GEMINI_API_KEY not configured", 
                "message": "Please set your Gemini API key in environment variables"
            }, status=500)
        
        # Read file and convert to base64
        content = image.read()
        b64 = base64.b64encode(content).decode("utf-8")
        
        # Determine MIME type based on file extension or content
        mime_type = "image/jpeg"  # default
        if hasattr(image, 'content_type') and image.content_type:
            mime_type = image.content_type
        elif hasattr(image, 'name') and image.name:
            if image.name.lower().endswith('.png'):
                mime_type = "image/png"
            elif image.name.lower().endswith('.webp'):
                mime_type = "image/webp"
        
        print(f"Processing image: {image.name if hasattr(image, 'name') else 'unknown'}, MIME: {mime_type}, Size: {len(content)} bytes")
        
        # Use Gemini Vision API for plant disease detection
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_api_key}"
        
        # Create bilingual prompt for both Malayalam and English output
        gemini_prompt = """Analyze this plant image for diseases/pests. You are an expert agricultural advisor for Kerala farmers.

Provide a CONCISE analysis in BOTH Malayalam and English in this format:

**ENGLISH:**
**Plant**: [Plant name]
**Disease/Pest**: [Specific name]
**Confidence**: [1-10]

**Quick Treatment**:
• **Immediate**: [1-2 urgent actions]
• **Organic**: [2-3 natural solutions available in Kerala]
• **Chemical**: [1-2 chemical options if needed]
• **Prevention**: [2-3 prevention tips]

**മലയാളം:**
**ചെടി**: [ചെടിയുടെ പേര്]
**രോഗം/കീടം**: [നിർദ്ദിഷ്ട പേര്]
**ആത്മവിശ്വാസം**: [1-10]

**പെട്ടെന്നുള്ള ചികിത്സ**:
• **ഉടനടി**: [1-2 അടിയന്തര നടപടികൾ]
• **ജൈവിക**: [കേരളത്തിൽ ലഭ്യമായ 2-3 പ്രകൃതിദത്ത പരിഹാരങ്ങൾ]
• **രാസവസ്തു**: [ആവശ്യമെങ്കിൽ 1-2 രാസ ഓപ്ഷനുകൾ]
• **പ്രതിരോധം**: [2-3 പ്രതിരോധ നുറുങ്ങുകൾ]

Keep each bullet point to 1 short sentence. Focus on practical solutions available in Kerala."""

        payload = {
            "contents": [{
                "parts": [
                    {"text": gemini_prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1000,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }
        
        print(f"Sending request to Gemini 2.0 Flash Experimental...")
        response = requests.post(
            gemini_url, 
            headers={'Content-Type': 'application/json'}, 
            json=payload, 
            timeout=30
        )
        
        print(f"Gemini API response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Gemini API error response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                ai_response = result['candidates'][0]['content']['parts'][0]['text']
                
                # Try to parse JSON response, fallback to text if needed
                try:
                    import json
                    # Extract JSON from response if it's wrapped in markdown
                    if '```json' in ai_response:
                        json_start = ai_response.find('```json') + 7
                        json_end = ai_response.find('```', json_start)
                        json_str = ai_response[json_start:json_end].strip()
                    else:
                        json_str = ai_response
                    
                    parsed_result = json.loads(json_str)
                    
                    return JsonResponse({
                        "success": True,
                        "result": {
                            "plant_name": parsed_result.get("plant_name", "Unknown plant"),
                            "is_healthy": parsed_result.get("is_healthy", True),
                            "disease_name": parsed_result.get("disease_name", ""),
                            "confidence": parsed_result.get("confidence", 5),
                            "treatment": parsed_result.get("treatment", ""),
                            "prevention": parsed_result.get("prevention", ""),
                            "source": "Gemini AI Vision",
                            "kerala_specific": True
                        },
                        "raw_response": ai_response
                    })
                except json.JSONDecodeError:
                    # Fallback to text response
                    return JsonResponse({
                        "success": True,
                        "result": {
                            "analysis": ai_response,
                            "source": "Gemini AI Vision",
                            "kerala_specific": True
                        }
                    })
            else:
                return JsonResponse({"error": "No response from Gemini AI"}, status=500)
        else:
            # Provide a helpful fallback response
            return JsonResponse({
                "success": True,
                "result": {
                    "analysis": "I'm having trouble analyzing this image right now. Here are some general tips for plant health:\n\n• Ensure proper watering - not too much, not too little\n• Check for pests on leaves and stems\n• Look for discoloration, spots, or wilting\n• Ensure good air circulation around plants\n• Consider soil quality and drainage\n\nFor specific issues, please consult your local agricultural officer or try uploading a clearer, well-lit photo.",
                    "source": "Krishi Sakhi Fallback",
                    "kerala_specific": True,
                    "note": f"Gemini API temporarily unavailable (Status: {response.status_code})"
                }
            })
            
    except Exception as e:
        return JsonResponse({"error": "Failed to analyze image", "message": str(e)}, status=500)


"""
Additional endpoints to keep frontend working without Node backend.
- Chatbot: simple placeholder responses (no external Dialogflow)
- Translate: simple echo/no-op by default
"""

# Additional imports for ViewSets
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from .serializers import (
    FarmerSerializer, FarmSerializer, ActivitySerializer, ReminderSerializer,
    CropCalendarSerializer, KnowledgeBaseSerializer, ActivityCreateSerializer,
    FarmerSummarySerializer, FarmSummarySerializer, AgriculturalOfficerSerializer,
    ConsultationSerializer, ConsultationCreateSerializer
)


# -------- FARMER & FARM MANAGEMENT -------- #

class FarmerViewSet(viewsets.ModelViewSet):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Get comprehensive dashboard data for a farmer"""
        farmer = self.get_object()
        
        # Recent activities
        recent_activities = Activity.objects.filter(farmer=farmer).order_by('-date')[:10]
        
        # Upcoming reminders
        upcoming_reminders = Reminder.objects.filter(
            farmer=farmer, 
            due_date__gte=timezone.now(),
            is_completed=False
        ).order_by('due_date')[:5]
        
        # Farm summary
        farms = Farm.objects.filter(farmer=farmer)
        
        data = {
            'farmer': FarmerSerializer(farmer).data,
            'farms': FarmSerializer(farms, many=True).data,
            'recent_activities': ActivitySerializer(recent_activities, many=True).data,
            'upcoming_reminders': ReminderSerializer(upcoming_reminders, many=True).data,
            'stats': {
                'total_farms': farms.count(),
                'total_acres': sum(farm.land_size_acres for farm in farms),
                'activities_this_month': Activity.objects.filter(
                    farmer=farmer,
                    date__gte=timezone.now().replace(day=1)
                ).count()
            }
        }
        
        return Response(data)
    
    def create(self, request, *args, **kwargs):
        """Custom create method for farmer registration"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get lightweight farmer list for dropdowns"""
        farmers = Farmer.objects.all()
        return Response(FarmerSummarySerializer(farmers, many=True).data)


class FarmViewSet(viewsets.ModelViewSet):
    queryset = Farm.objects.all()
    serializer_class = FarmSerializer
    
    def get_queryset(self):
        queryset = Farm.objects.all()
        farmer_id = self.request.query_params.get('farmer_id')
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Override create to add better error handling"""
        print(f"Farm creation request data: {request.data}")
        
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
                print(f"Farm created successfully: {serializer.data}")
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            else:
                print(f"Farm validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Validation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Farm creation exception: {str(e)}")
            return Response({
                'success': False,
                'message': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get lightweight farm list for dropdowns"""
        farms = self.get_queryset()
        return Response(FarmSummarySerializer(farms, many=True).data)


# -------- ACTIVITY TRACKING -------- #

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    
    def get_queryset(self):
        queryset = Activity.objects.all()
        farmer_id = self.request.query_params.get('farmer_id')
        farm_id = self.request.query_params.get('farm_id')
        activity_type = self.request.query_params.get('type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
        if farm_id:
            queryset = queryset.filter(farm_id=farm_id)
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ActivityCreateSerializer
        return ActivitySerializer
    
    @action(detail=False, methods=['post'])
    def quick_add(self, request):
        """Quick add activity with text parsing"""
        serializer = ActivityCreateSerializer(data=request.data)
        if serializer.is_valid():
            activity = serializer.save()
            return Response(ActivitySerializer(activity).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -------- REMINDERS & ALERTS -------- #

class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    
    def get_queryset(self):
        queryset = Reminder.objects.all()
        farmer_id = self.request.query_params.get('farmer_id')
        category = self.request.query_params.get('category')
        is_completed = self.request.query_params.get('is_completed')
        
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
        if category:
            queryset = queryset.filter(category=category)
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed.lower() == 'true')
            
        return queryset
    
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark reminder as completed"""
        reminder = self.get_object()
        reminder.is_completed = True
        reminder.save()
        return Response({'status': 'completed'})
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming reminders for a farmer"""
        farmer_id = request.query_params.get('farmer_id')
        if not farmer_id:
            return Response({'error': 'farmer_id is required'}, status=400)
            
        reminders = Reminder.objects.filter(
            farmer_id=farmer_id,
            due_date__gte=timezone.now(),
            is_completed=False
        ).order_by('due_date')[:10]
        
        return Response(ReminderSerializer(reminders, many=True).data)


# -------- KNOWLEDGE ENGINE -------- #

class KnowledgeViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBase.objects.all()
    serializer_class = KnowledgeBaseSerializer
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Get personalized recommendations for a farmer"""
        farmer_id = request.query_params.get('farmer_id')
        if not farmer_id:
            return Response({'error': 'farmer_id is required'}, status=400)
            
        try:
            farmer = Farmer.objects.get(id=farmer_id)
            farms = Farm.objects.filter(farmer=farmer)
            
            recommendations = []
            
            # Get crop-specific knowledge
            for farm in farms:
                crops = farm.get_crops_list()
                for crop in crops:
                    knowledge_items = KnowledgeBase.objects.filter(
                        applicable_crops__icontains=crop
                    )[:3]
                    
                    for item in knowledge_items:
                        recommendations.append({
                            'title': item.title,
                            'content': item.content,
                            'type': item.knowledge_type,
                            'farm': farm.name,
                            'crop': crop
                        })
            
            # Generate automatic reminders based on crop calendar
            current_month = timezone.now().month
            for farm in farms:
                crops = farm.get_crops_list()
                for crop in crops:
                    try:
                        calendar = CropCalendar.objects.get(
                            crop_name__iexact=crop,
                            district__iexact=farm.district
                        )
                        
                        # Check if it's sowing season
                        if calendar.sowing_start_month <= current_month <= calendar.sowing_end_month:
                            recommendations.append({
                                'title': f'Sowing Season for {crop}',
                                'content': f'This is the ideal time to sow {crop} in {farm.district}. {calendar.best_practices}',
                                'type': 'operation',
                                'farm': farm.name,
                                'crop': crop,
                                'is_seasonal': True
                            })
                        
                        # Check if it's harvest season
                        if calendar.harvest_start_month <= current_month <= calendar.harvest_end_month:
                            recommendations.append({
                                'title': f'Harvest Season for {crop}',
                                'content': f'Time to harvest {crop} in {farm.district}. Ensure proper storage and market timing.',
                                'type': 'operation',
                                'farm': farm.name,
                                'crop': crop,
                                'is_seasonal': True
                            })
                            
                    except CropCalendar.DoesNotExist:
                        pass
            
            return Response({
                'farmer': farmer.name,
                'recommendations': recommendations[:10],  # Limit to 10 recommendations
                'generated_at': timezone.now()
            })
            
        except Farmer.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=404)
    
    @action(detail=False, methods=['get'])
    def tips(self, request):
        """Get tips for specific crop and region"""
        crop = request.query_params.get('crop')
        district = request.query_params.get('district')
        
        queryset = KnowledgeBase.objects.all()
        
        if crop:
            queryset = queryset.filter(applicable_crops__icontains=crop)
        if district:
            queryset = queryset.filter(applicable_regions__icontains=district)
            
        tips = queryset[:5]
        return Response(KnowledgeBaseSerializer(tips, many=True).data)


class CropCalendarViewSet(viewsets.ModelViewSet):
    queryset = CropCalendar.objects.all()
    serializer_class = CropCalendarSerializer
    
    def get_queryset(self):
        queryset = CropCalendar.objects.all()
        crop = self.request.query_params.get('crop')
        district = self.request.query_params.get('district')
        
        if crop:
            queryset = queryset.filter(crop_name__icontains=crop)
        if district:
            queryset = queryset.filter(district__icontains=district)
            
        return queryset


@api_view(["POST"])
@parser_classes([JSONParser])
def chatbot_chat(request):
    message = (request.data or {}).get("message", "").strip()
    if not message:
        return JsonResponse({"success": False, "error": "Message is required"}, status=400)
    # Placeholder deterministic reply
    reply = (
        "I am Ammachi AI assistant. For weather, use the Weather page; for disease detection, "
        "upload a clear leaf image on the Detect page; for market prices, open the Market page."
    )
    return JsonResponse({"success": True, "reply": reply})


@api_view(["POST"])
@parser_classes([JSONParser])
def chatbot_gemini(request):
    """Enhanced chatbot using Gemini API for intelligent farming advice"""
    import os
    import requests
    
    message = (request.data or {}).get("message", "").strip()
    history = (request.data or {}).get("history")
    system_prompt = (request.data or {}).get("system_prompt", "").strip()
    language = (request.data or {}).get("language", "english")
    farmer_id = (request.data or {}).get("farmer_id")
    
    if not message:
        return JsonResponse({"success": False, "error": "Message is required"}, status=400)
    
    print(f"chatbot_gemini called. Message: {message[:50]}..., Language: {language}, Key present: {bool(os.getenv('GEMINI_API_KEY'))}")
    try:
        # Get Gemini API key from environment
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            # Fallback to intelligent response without API
            return generate_smart_fallback_response(message, language, farmer_id)
        
        # Prepare Gemini API request (using Gemini 2.5 Flash)
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_api_key}"
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        # Build contents payload
        if history is not None:
            # Convert history to a list and append current user message
            contents = list(history)
            contents.append({
                "role": "user",
                "parts": [{"text": message}]
            })
        else:
            # Single-turn mode
            contents = [{
                "role": "user",
                "parts": [{"text": message}]
            }]
            
        # Set up systemInstruction
        if not system_prompt:
            # Default fallback system prompt
            system_prompt = f"""You are Krishi Sakhi, an AI farming assistant specifically designed for Kerala farmers. 
            
            Key Guidelines:
            - Respond in {language} language
            - Focus on Kerala's climate, crops (rice, coconut, pepper, cardamom, rubber), and farming practices
            - Provide practical, actionable advice
            - Consider current season (post-monsoon: October-December)
            - Include weather-based recommendations when relevant
            - Mention government schemes if applicable
            - Keep responses under 150 words
            - Be conversational and supportive like a knowledgeable farming friend
            
            Current farming context for Kerala:
            - Season: Post-monsoon (good for land preparation, pest management)
            - Common issues: Post-harvest activities, storage, pest control
            - Weather: Cooler, less humid, occasional showers
            """
            
        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{
                    "text": system_prompt
                }]
            },
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1000,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }
        
        print(f"Calling Gemini API: {gemini_url[:80]}...")
        response = requests.post(gemini_url, headers=headers, json=payload, timeout=10)
        
        print(f"Gemini API response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Gemini API error: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                reply = result['candidates'][0]['content']['parts'][0]['text']
                return JsonResponse({"success": True, "reply": reply.strip()})
        
        # Fallback if API fails
        return generate_smart_fallback_response(message, language, farmer_id)
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        return generate_smart_fallback_response(message, language, farmer_id)


def generate_smart_fallback_response(message, language, farmer_id):
    """Generate intelligent fallback responses based on keywords"""
    import random
    message_lower = message.lower()
    
    # Malayalam responses
    malayalam_responses = {
        'weather': "കാലാവസ്ഥാ വിവരങ്ങൾക്ക് Weather പേജ് സന്ദർശിക്കുക. മഴയുടെ സാധ്യത ഉണ്ടെങ്കിൽ കീടനാശിനി തളിക്കരുത്.",
        'disease': "രോഗം കണ്ടെത്താൻ Detect പേജിൽ ഇലയുടെ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക. വ്യക്തമായ ഫോട്ടോ എടുക്കുക.",
        'price': "വിപണി വിലകൾക്ക് Market പേജ് പരിശോധിക്കുക. നിലവിലെ വിലകൾ അറിയാം.",
        'fertilizer': "വളം ഇടുന്നതിന് മുമ്പ് മണ്ണ് പരിശോധന നടത്തുക. ജൈവ വളം ഉപയോഗിക്കുക.",
        'pest': "കീടങ്ങൾക്ക് നീം എണ്ണ ഉപയോഗിക്കുക. രാവിലെ അല്ലെങ്കിൽ വൈകുന്നേരം തളിക്കുക.",
        'default': "ഞാൻ നിങ്ങളുടെ കൃഷി സഖിയാണ്. കൂടുതൽ വിവരങ്ങൾക്ക് വിവിധ പേജുകൾ സന്ദർശിക്കുക."
    }
    
    # English responses
    english_responses = {
        'weather': "Check the Weather page for forecasts. Avoid spraying if rain is expected within 24 hours.",
        'disease': "Upload a clear photo of affected leaves on the Detect page for disease identification.",
        'price': "Visit the Market page for current crop prices and market trends in your area.",
        'fertilizer': "Conduct soil testing before fertilizing. Use organic fertilizers for better soil health.",
        'pest': "Use neem oil for pest control. Apply during early morning or evening hours.",
        'default': "I'm your Krishi Sakhi. Visit different pages for weather, disease detection, and market prices."
    }
    
    responses = malayalam_responses if language == 'malayalam' else english_responses
    
    # Keyword matching
    if any(word in message_lower for word in ['weather', 'rain', 'മഴ', 'കാലാവസ്ഥ']):
        reply = responses['weather']
    elif any(word in message_lower for word in ['disease', 'sick', 'രോഗം', 'അസുഖം']):
        reply = responses['disease']
    elif any(word in message_lower for word in ['price', 'market', 'വില', 'വിപണി']):
        reply = responses['price']
    elif any(word in message_lower for word in ['fertilizer', 'വളം', 'manure']):
        reply = responses['fertilizer']
    elif any(word in message_lower for word in ['pest', 'insect', 'കീടം', 'പുഴു']):
        reply = responses['pest']
    else:
        reply = responses['default']
    
    return JsonResponse({"success": True, "reply": reply})


@api_view(["POST"])
@parser_classes([JSONParser])
def chatbot_remedies(request):
    disease = (request.data or {}).get("disease", "").strip()
    if not disease:
        return JsonResponse({"success": False, "error": "Disease name is required"}, status=400)
    response = (
        f"General guidance for {disease}:\n"
        "• Ensure proper spacing and avoid overhead watering.\n"
        "• Use neem oil or copper-based fungicides per label.\n"
        "• Consult local agricultural experts for region-specific advice."
    )
    return JsonResponse({"success": True, "response": response})


@api_view(["GET"])
def test_gemini(request):
    """Test endpoint to check if Gemini API is working"""
    import os
    import requests
    
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        return JsonResponse({"error": "GEMINI_API_KEY not found"}, status=500)
    
    try:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": "Hello, just testing the API. Respond with 'API is working!'"}]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 100,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }
        
        response = requests.post(gemini_url, headers={'Content-Type': 'application/json'}, json=payload, timeout=10)
        
        return JsonResponse({
            "status_code": response.status_code,
            "response_text": response.text[:500],
            "api_key_present": bool(gemini_api_key),
            "api_key_length": len(gemini_api_key) if gemini_api_key else 0
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["POST"])
@parser_classes([JSONParser])
def translate_text(request):
    text = (request.data or {}).get("text", "")
    # For now, return text unchanged; the frontend already supports local language toggle
    return JsonResponse({"translatedText": text})


# -------- AGRICULTURAL OFFICERS -------- #

class AgriculturalOfficerViewSet(viewsets.ModelViewSet):
    queryset = AgriculturalOfficer.objects.all()
    serializer_class = AgriculturalOfficerSerializer
    
    def get_queryset(self):
        queryset = AgriculturalOfficer.objects.all()
        district = self.request.query_params.get('district')
        specialization = self.request.query_params.get('specialization')
        is_available = self.request.query_params.get('is_available')
        
        if district:
            queryset = queryset.filter(district__icontains=district)
        if specialization:
            queryset = queryset.filter(specialization__icontains=specialization)
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
            
        return queryset.filter(is_available=True)
    
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get officers by farmer's location"""
        farmer_id = request.query_params.get('farmer_id')
        if not farmer_id:
            return Response({'error': 'farmer_id is required'}, status=400)
            
        try:
            farmer = Farmer.objects.get(id=farmer_id)
            officers = AgriculturalOfficer.objects.filter(
                district=farmer.district,
                is_available=True
            ).order_by('-rating')
            
            return Response(AgriculturalOfficerSerializer(officers, many=True).data)
        except Farmer.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=404)


class ConsultationViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.all()
    serializer_class = ConsultationSerializer
    
    def get_queryset(self):
        queryset = Consultation.objects.all()
        farmer_id = self.request.query_params.get('farmer_id')
        officer_id = self.request.query_params.get('officer_id')
        status_filter = self.request.query_params.get('status')
        
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
        if officer_id:
            queryset = queryset.filter(officer_id=officer_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationCreateSerializer
        return ConsultationSerializer
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update consultation status"""
        consultation = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if new_status in ['pending', 'accepted', 'completed', 'cancelled']:
            consultation.status = new_status
            if notes:
                consultation.notes = notes
            consultation.save()
            
            return Response({
                'status': 'updated',
                'new_status': new_status
            })
        else:
            return Response({
                'error': 'Invalid status'
            }, status=400)


# -------- MISSING API ENDPOINTS -------- #

@api_view(["POST"])
@parser_classes([JSONParser])
def feedback_submit(request):
    """Submit feedback from users"""
    try:
        data = request.data
        
        # For now, just log the feedback (you can add to database later)
        feedback_data = {
            'farmer_id': data.get('farmer'),
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'user_type': data.get('user_type'),
            'category': data.get('category'),
            'rating': data.get('rating'),
            'subject': data.get('subject'),
            'message': data.get('message'),
            'suggestions': data.get('suggestions'),
            'submitted_at': data.get('submitted_at')
        }
        
        print(f"Feedback received: {feedback_data}")
        
        return JsonResponse({
            'success': True,
            'message': 'Feedback submitted successfully',
            'id': 'temp_' + str(timezone.now().timestamp())
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@api_view(["GET"])
def farmers_summary(request):
    """Get a summary list of all farmers for dropdowns"""
    try:
        farmers = Farmer.objects.all().values('id', 'name', 'district', 'phone')
        return JsonResponse(list(farmers), safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def farmer_dashboard(request, farmer_id):
    """Get comprehensive dashboard data for a farmer"""
    try:
        farmer = Farmer.objects.get(id=farmer_id)
        
        # Get farmer's farms
        farms = Farm.objects.filter(farmer=farmer)
        
        # Get recent activities
        recent_activities = Activity.objects.filter(farmer=farmer).order_by('-date')[:5]
        
        # Get upcoming reminders
        upcoming_reminders = Reminder.objects.filter(
            farmer=farmer, 
            is_completed=False,
            due_date__gte=timezone.now()
        ).order_by('due_date')[:3]
        
        # Calculate stats
        total_farms = farms.count()
        total_acres = sum(float(farm.land_size_acres or 0) for farm in farms)
        active_farms = total_farms  # All farms are considered active since there's no is_active field
        
        dashboard_data = {
            'farmer': {
                'id': farmer.id,
                'name': farmer.name,
                'phone': farmer.phone,
                'email': farmer.email,
                'district': farmer.district,
                'state': farmer.state,
                'experience_years': getattr(farmer, 'experience_years', 5)
            },
            'farms': {
                'total': total_farms,
                'active': active_farms,
                'total_acres': total_acres,
                'crops': list(set(farm.primary_crops for farm in farms if farm.primary_crops))
            },
            'activities': {
                'recent': [
                    {
                        'id': activity.id,
                        'type': activity.activity_type,
                        'description': activity.description,
                        'date': activity.date,
                        'farm': activity.farm.name if activity.farm else None
                    } for activity in recent_activities
                ],
                'count': recent_activities.count()
            },
            'reminders': {
                'upcoming': [
                    {
                        'id': reminder.id,
                        'title': reminder.title,
                        'description': reminder.description,
                        'due_date': reminder.due_date,
                        'category': reminder.category
                    } for reminder in upcoming_reminders
                ],
                'count': upcoming_reminders.count()
            }
        }
        
        return JsonResponse(dashboard_data)
        
    except Farmer.DoesNotExist:
        return JsonResponse({'error': 'Farmer not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(["GET"])
def farmers_summary(request):
    """Get summary list of farmers for dropdowns"""
    try:
        farmers = Farmer.objects.all()
        farmer_list = [
            {
                'id': farmer.id,
                'name': farmer.name,
                'phone': farmer.phone,
                'district': farmer.district
            } for farmer in farmers
        ]
        
        return JsonResponse(farmer_list, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(["POST"])
@parser_classes([JSONParser])
def activity_quick_add(request):
    """Quick add activity endpoint"""
    try:
        data = request.data
        
        # Create activity with minimal data
        activity = Activity.objects.create(
            farmer_id=data.get('farmer'),
            activity_type=data.get('activity_type', 'general'),
            description=data.get('description', ''),
            date=data.get('date', timezone.now().date()),
            text_note=data.get('text_note', '')
        )
        
        return JsonResponse({
            'success': True,
            'activity_id': activity.id,
            'message': 'Activity added successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@api_view(["POST"])
def reminder_mark_completed(request, reminder_id):
    """Mark a reminder as completed"""
    try:
        reminder = Reminder.objects.get(id=reminder_id)
        reminder.is_completed = True
        reminder.completed_date = timezone.now()
        reminder.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Reminder marked as completed'
        })
        
    except Reminder.DoesNotExist:
        return JsonResponse({'error': 'Reminder not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
