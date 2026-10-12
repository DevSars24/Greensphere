from fastapi import APIRouter, HTTPException, Depends
from typing import List
from database import database
from models.women_empowerment import Scheme, TrainingProgram, FinancialAid, SHG, HealthSafetyTip

router = APIRouter(
    prefix="/women",
    tags=["Women Empowerment"]
)

# --- Schemes ---
@router.get("/schemes", response_model=List[Scheme])
async def get_schemes():
    schemes = await database.schemes.find().to_list(100)
    # If empty, return dummy data for demo
    if not schemes:
        return [
            Scheme(title="Mahila Kisan Sashaktikaran Pariyojana (MKSP)", description="Empowering women in agriculture.", eligibility="Women farmers in SHGs", benefits="Sustainable agriculture training", application_link="https://mksp.gov.in"),
            Scheme(title="Pradhan Mantri Matru Vandana Yojana", description="Maternity benefit program.", eligibility="Pregnant women", benefits="Cash incentive of ₹5000", application_link="https://wcd.nic.in"),
        ]
    return schemes

@router.post("/schemes", response_model=Scheme)
async def create_scheme(scheme: Scheme):
    new_scheme = await database.schemes.insert_one(scheme.dict())
    return scheme

# --- Training ---
@router.get("/training", response_model=List[TrainingProgram])
async def get_training():
    programs = await database.training.find().to_list(100)
    if not programs:
        return [
            TrainingProgram(title="Organic Farming Workshop", organizer="Krishi Vigyan Kendra", description="Learn organic farming techniques.", duration="3 Days", location="Village Hall"),
        ]
    return programs

@router.post("/training", response_model=TrainingProgram)
async def create_training(program: TrainingProgram):
    await database.training.insert_one(program.dict())
    return program

# --- Financial Aid ---
@router.get("/financial-aid", response_model=List[FinancialAid])
async def get_financial_aid():
    aid = await database.financial_aid.find().to_list(100)
    if not aid:
        return [
             FinancialAid(title="Kisan Credit Card for Women", provider="SBI", amount_range="₹50,000 - ₹3,00,000", eligibility="Land-holding women farmers", application_process="Visit nearest SBI branch"),
        ]
    return aid

@router.post("/financial-aid", response_model=FinancialAid)
async def create_financial_aid(aid: FinancialAid):
    await database.financial_aid.insert_one(aid.dict())
    return aid

# --- SHGs ---
@router.get("/shgs", response_model=List[SHG])
async def get_shgs():
    shgs = await database.shgs.find().to_list(100)
    if not shgs:
        return [
            SHG(
                name="Kudumbashree Unit 42", 
                location="Thiruvananthapuram, Kerala", 
                state="Kerala",
                city="Thiruvananthapuram",
                district="Thiruvananthapuram",
                members_count=20, 
                focus_area="Food Processing", 
                contact_person="Lakshmi Menon",
                contact_number="+91 9876543210"
            ),
            SHG(
                name="SEWA Gram Mahila Haat", 
                location="Ahmedabad, Gujarat", 
                state="Gujarat",
                city="Ahmedabad",
                district="Ahmedabad",
                members_count=50, 
                focus_area="Handicrafts & Textiles", 
                contact_person="Benazir",
                contact_number="+91 9123456780"
            ),
            SHG(
                name="Bokaro Mahila Mandal", 
                location="Bokaro, Jharkhand", 
                state="Jharkhand",
                city="Bokaro",
                district="Bokaro",
                members_count=15, 
                focus_area="Mango Orchard Management", 
                contact_person="Rina Devi",
                contact_number="+91 9988776655"
            ),
        ]
    return shgs

@router.post("/shgs", response_model=SHG)
async def create_shg(shg: SHG):
    await database.shgs.insert_one(shg.dict())
    return shg

# --- Health & Safety ---
@router.get("/health-safety", response_model=List[HealthSafetyTip])
async def get_health_safety():
    tips = await database.health_safety.find().to_list(100)
    if not tips:
        return [
            HealthSafetyTip(title="Pesticide Safety", content="Always wear a mask and gloves while spraying pesticides."),
        ]
    return tips

@router.post("/health-safety", response_model=HealthSafetyTip)
async def create_health_safety(tip: HealthSafetyTip):
    await database.health_safety.insert_one(tip.dict())
    return tip

# --- Training Chatbot Endpoint ---
import google.generativeai as genai
import os
from pydantic import BaseModel

class TrainingChatRequest(BaseModel):
    message: str

class TrainingChatResponse(BaseModel):
    response: str

TRAINING_SYSTEM_INSTRUCTION = """
You are the "Krishi Vidya" AI Tutor, a friendly and encouraging mentor for women farmers taking a 6-week entrepreneurship course.
Your goal is to explain concepts simply, give practical examples, and motivate them.

Context: 
The user is viewing a 6-week course covering:
Week 0: Orientation
Week 1: Sustainable Farming (Soil, Seeds, Water)
Week 2: Integrated Farming (Poultry, Goats, Kitchen Garden)
Week 3: Post-harvest & Processing (Value addition)
Week 4: Business Basics (Accounting, Digital tools)
Week 5: Marketing & Branding
Week 6: Finance & Linkages (Loans, Schemes)

If the user asks about a specific week, explain the key takeaways factually based on this curriculum.
Never invent weeks or fake scheme details. Keep answers concise (under 100 words), encouraging, and practical.
Support Languages: Hindi, English, Hinglish. Detect language and reply in the same language.
"""

@router.post("/training-chat", response_model=TrainingChatResponse)
async def training_chat_endpoint(request: TrainingChatRequest):
    groq_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    
    # 1. Try Groq (high-speed, factual inference)
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            completion = client.chat.completions.create(
                model=groq_model,
                messages=[
                    {"role": "system", "content": TRAINING_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": request.message}
                ],
                temperature=0.2,
                max_tokens=300
            )
            if completion.choices and completion.choices[0].message.content:
                return TrainingChatResponse(response=completion.choices[0].message.content.strip())
        except Exception as e:
            print(f"[GROQ TRAINING-CHAT NOTICE]: {e}, falling back to Gemini")

    # 2. Fallback to Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return TrainingChatResponse(response="Server Error: AI API Key missing. Please configure backend/.env.")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=TRAINING_SYSTEM_INSTRUCTION
        )
        response = model.generate_content(request.message)
        return TrainingChatResponse(response=response.text.strip())
    except Exception as e:
        return TrainingChatResponse(response=f"Error processing request: {str(e)}")
