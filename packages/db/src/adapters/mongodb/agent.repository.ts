import { Db, ObjectId } from "mongodb";
import type { Agent } from "@multibotagents/types";
import type { IAgentRepository } from "../../interfaces";
import {
  AGENTS_COLLECTION,
  type AgentDocument,
} from "../../schemas/agent.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio Agent. */
function toEntity(doc: AgentDocument): Agent {
  const instructions = doc.instrucciones || doc.personality?.instructions || "";
  const personalityInstructions = doc.personality?.instructions || doc.instrucciones || "";

  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    nombre: doc.nombre,
    tipo: doc.tipo,
    estado: doc.estado,
    instrucciones: instructions,
    relevanceThreshold: doc.relevanceThreshold,
    topK: doc.topK,
    maxResponseLength: doc.maxResponseLength,
    memoryWindow: doc.memoryWindow,
    welcomeMessage: doc.welcomeMessage,
    noInfoMessage: doc.noInfoMessage,
    errorMessage: doc.errorMessage,
    language: doc.language,
    failedAttemptsBeforeEscalation: doc.failedAttemptsBeforeEscalation,
    personality: doc.personality ? {
      name: doc.personality.name,
      tone: doc.personality.tone,
      restrictions: doc.personality.restrictions,
      instructions: personalityInstructions,
    } : {
      name: doc.nombre,
      tone: "profesional",
      restrictions: [],
      instructions: instructions,
    },
    googleCalendarEmail: doc.googleCalendarEmail,
    googleCalendarRefreshToken: doc.googleCalendarRefreshToken,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class AgentRepository implements IAgentRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<AgentDocument>(AGENTS_COLLECTION);
  }

  async findById(id: string): Promise<Agent | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findByCompanyId(companyId: string): Promise<Agent[]> {
    const docs = await this.collection.find({ companyId: new ObjectId(companyId) }).toArray();
    return docs.map(toEntity);
  }

  async findAll(filter?: Partial<Agent>): Promise<Agent[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.companyId) query.companyId = new ObjectId(filter.companyId);
      if (filter.nombre) query.nombre = filter.nombre;
      if (filter.tipo) query.tipo = filter.tipo;
      if (filter.estado) query.estado = filter.estado;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<Agent, "id">): Promise<Agent> {
    const now = new Date();
    const instructions = entity.instrucciones || entity.personality?.instructions || "Eres un asistente útil.";
    const personalityInstructions = entity.personality?.instructions || entity.instrucciones || "Eres un asistente útil.";

    const doc: Omit<AgentDocument, "_id"> = {
      companyId: new ObjectId(entity.companyId),
      nombre: entity.nombre,
      tipo: entity.tipo,
      estado: entity.estado,
      instrucciones: instructions,
      relevanceThreshold: entity.relevanceThreshold,
      topK: entity.topK,
      maxResponseLength: entity.maxResponseLength,
      memoryWindow: entity.memoryWindow,
      welcomeMessage: entity.welcomeMessage,
      noInfoMessage: entity.noInfoMessage,
      errorMessage: entity.errorMessage,
      language: entity.language,
      failedAttemptsBeforeEscalation: entity.failedAttemptsBeforeEscalation,
      personality: {
        name: entity.personality.name,
        tone: entity.personality.tone,
        restrictions: entity.personality.restrictions,
        instructions: personalityInstructions,
      },
      googleCalendarEmail: entity.googleCalendarEmail,
      googleCalendarRefreshToken: entity.googleCalendarRefreshToken,
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
    };

    const result = await this.collection.insertOne(doc as AgentDocument);
    return toEntity({ _id: result.insertedId, ...doc } as AgentDocument);
  }

  async update(id: string, entity: Partial<Agent>): Promise<Agent> {
    const updateData: Record<string, unknown> = {};

    if (entity.nombre !== undefined) updateData.nombre = entity.nombre;
    if (entity.tipo !== undefined) updateData.tipo = entity.tipo;
    if (entity.estado !== undefined) updateData.estado = entity.estado;
    if (entity.relevanceThreshold !== undefined) updateData.relevanceThreshold = entity.relevanceThreshold;
    if (entity.topK !== undefined) updateData.topK = entity.topK;
    if (entity.maxResponseLength !== undefined) updateData.maxResponseLength = entity.maxResponseLength;
    if (entity.memoryWindow !== undefined) updateData.memoryWindow = entity.memoryWindow;
    if (entity.welcomeMessage !== undefined) updateData.welcomeMessage = entity.welcomeMessage;
    if (entity.noInfoMessage !== undefined) updateData.noInfoMessage = entity.noInfoMessage;
    if (entity.errorMessage !== undefined) updateData.errorMessage = entity.errorMessage;
    if (entity.language !== undefined) updateData.language = entity.language;
    if (entity.failedAttemptsBeforeEscalation !== undefined) {
      updateData.failedAttemptsBeforeEscalation = entity.failedAttemptsBeforeEscalation;
    }
    
    if (entity.instrucciones !== undefined) {
      updateData.instrucciones = entity.instrucciones;
      updateData["personality.instructions"] = entity.instrucciones;
    }

    if (entity.personality !== undefined) {
      updateData.personality = {
        name: entity.personality.name,
        tone: entity.personality.tone,
        restrictions: entity.personality.restrictions,
        instructions: entity.personality.instructions,
      };
      updateData.instrucciones = entity.personality.instructions;
    }

    if (entity.googleCalendarEmail !== undefined) {
      updateData.googleCalendarEmail = entity.googleCalendarEmail;
    }
    if (entity.googleCalendarRefreshToken !== undefined) {
      updateData.googleCalendarRefreshToken = entity.googleCalendarRefreshToken;
    }

    updateData.updatedAt = new Date();

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) throw new Error(`Agent not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
