import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { Donation } from './entities/donation.entity';
import {
  GetProjectsQueryDto,
  ProjectSortBy,
} from './dtos/get-projects-query.dto';
import { CreateProjectDto } from './dtos/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    creatorId: string,
  ): Promise<Project> {
    const {
      projectName,
      projectDesc,
      projectImage,
      fundingGoal,
      deadline,
      category,
    } = createProjectDto;

    // Validate that the deadline is in the future
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      throw new BadRequestException('Deadline must be a valid date');
    }
    if (deadlineDate <= new Date()) {
      throw new BadRequestException('Deadline must be a future date');
    }

    const project = this.projectRepository.create({
      title: projectName,
      description: projectDesc,
      imageUrl: projectImage,
      goalAmount: fundingGoal,
      deadline: deadlineDate,
      status: ProjectStatus.PENDING,
      progress: 0,
      donationCount: 0,
      fundsRaised: 0,
      creatorId,
      ...(category && { category }),
    });

    return this.projectRepository.save(project);
  }

  async findAll(
    query: GetProjectsQueryDto,
  ): Promise<{ data: Partial<Project>[]; total: number }> {
    const {
      category,
      status,
      search,
      sortBy = ProjectSortBy.NEWEST,
      limit = 10,
      offset = 0,
    } = query;

    const qb: SelectQueryBuilder<Project> = this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.creator', 'creator')
      .select([
        'project.id',
        'project.title',
        'project.description',
        'project.category',
        'project.status',
        'project.goalAmount',
        'project.fundsRaised',
        'project.imageUrl',
        'project.deadline',
        'project.createdAt',
        'project.updatedAt',
        // creator info — sensitive fields excluded
        'creator.id',
        'creator.firstName',
        'creator.lastName',
        'creator.walletAddress',
      ]);

    // Default: only APPROVED or ACTIVE projects unless a specific status is requested
    if (status) {
      qb.where('project.status = :status', { status });
    } else {
      qb.where('project.status IN (:...statuses)', {
        statuses: [ProjectStatus.APPROVED, ProjectStatus.ACTIVE],
      });
    }

    if (category) {
      qb.andWhere('project.category = :category', { category });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(project.title) LIKE :search OR LOWER(project.description) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    switch (sortBy) {
      case ProjectSortBy.MOST_FUNDED:
        qb.orderBy('project.fundsRaised', 'DESC');
        break;
      case ProjectSortBy.ENDING_SOON:
        qb.orderBy('project.deadline', 'ASC');
        break;
      case ProjectSortBy.NEWEST:
      default:
        qb.orderBy('project.createdAt', 'DESC');
        break;
    }

    const total = await qb.getCount();

    const data = await qb.skip(offset).take(limit).getMany();

    return { data, total };
  }

  async findOnePublic(id: string) {
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.creator', 'creator')
      .where('project.id = :id', { id })
      .andWhere('project.status IN (:...statuses)', {
        statuses: [ProjectStatus.APPROVED, ProjectStatus.ACTIVE],
      })
      .getOne();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const donationStatsRaw = await this.donationRepository
      .createQueryBuilder('donation')
      .select('COUNT(donation.id)', 'totalDonations')
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'totalAmount')
      .addSelect('COUNT(DISTINCT donation.donorId)', 'uniqueDonors')
      .where('donation.projectId = :projectId', { projectId: id })
      .getRawOne<{
        totalDonations: string;
        totalAmount: string;
        uniqueDonors: string;
      }>();

    const recentDonations = await this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.donor', 'donor')
      .where('donation.projectId = :projectId', { projectId: id })
      .orderBy('donation.createdAt', 'DESC')
      .take(5)
      .getMany();

    const goalAmount = Number(project.goalAmount) || 0;
    const fundsRaised = Number(project.fundsRaised) || 0;
    const progressPercentage =
      goalAmount > 0 ? Math.min((fundsRaised / goalAmount) * 100, 100) : 0;

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      imageUrl: project.imageUrl,
      category: project.category,
      status: project.status,
      goalAmount,
      fundsRaised,
      deadline: project.deadline,
      rejectionReason: project.rejectionReason,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      creator: {
        id: project.creator.id,
        firstName: project.creator.firstName,
        lastName: project.creator.lastName,
        walletAddress: project.creator.walletAddress,
        avatarUrl: project.creator.avatarUrl,
        country: project.creator.country,
      },
      donationSummary: {
        totalDonations: Number(donationStatsRaw?.totalDonations ?? 0),
        totalAmount: Number(donationStatsRaw?.totalAmount ?? 0),
        uniqueDonors: Number(donationStatsRaw?.uniqueDonors ?? 0),
      },
      progressPercentage: Number(progressPercentage.toFixed(2)),
      recentDonations: recentDonations.map((donation) => ({
        id: donation.id,
        amount: Number(donation.amount),
        transactionHash: donation.transactionHash,
        isAnonymous: donation.isAnonymous,
        createdAt: donation.createdAt,
        donor:
          donation.isAnonymous || !donation.donor
            ? null
            : {
                id: donation.donor.id,
                firstName: donation.donor.firstName,
                lastName: donation.donor.lastName,
                avatarUrl: donation.donor.avatarUrl,
              },
      })),
    };
  }
}
