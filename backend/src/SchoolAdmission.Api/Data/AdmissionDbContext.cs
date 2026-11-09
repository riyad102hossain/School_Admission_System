using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Data;

public class AdmissionDbContext(DbContextOptions<AdmissionDbContext> options) : DbContext(options)
{
    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<Hold> Holds => Set<Hold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SchoolClass>(entity =>
        {
            entity.ToTable("classes", t =>
            {
                t.HasCheckConstraint("ck_classes_total_seats_positive", "total_seats > 0");
                t.HasCheckConstraint("ck_classes_held_seats_non_negative", "held_seats >= 0");
                t.HasCheckConstraint("ck_classes_confirmed_seats_non_negative", "confirmed_seats >= 0");
                // Last line of defence against overbooking, even if application code is wrong.
                t.HasCheckConstraint("ck_classes_no_overbooking", "held_seats + confirmed_seats <= total_seats");
            });

            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Ignore(c => c.AvailableSeats);
        });

        modelBuilder.Entity<Hold>(entity =>
        {
            entity.ToTable("holds");

            entity.HasKey(h => h.Id);
            entity.Property(h => h.StudentId).HasMaxLength(17).IsFixedLength().IsRequired();
            entity.Property(h => h.Status)
                .HasConversion(
                    status => status.ToString().ToUpperInvariant(),
                    value => Enum.Parse<HoldStatus>(value, true))
                .HasMaxLength(16)
                .IsRequired();

            entity.HasOne(h => h.Class)
                .WithMany(c => c.Holds)
                .HasForeignKey(h => h.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // A student can have at most one active (held or confirmed) application per class.
            entity.HasIndex(h => new { h.ClassId, h.StudentId })
                .IsUnique()
                .HasFilter("status IN ('HELD', 'CONFIRMED')")
                .HasDatabaseName("ux_holds_active_student_per_class");

            entity.HasIndex(h => h.StudentId);

            // Used by the background job that releases expired holds.
            entity.HasIndex(h => h.ExpiresAt)
                .HasFilter("status = 'HELD'")
                .HasDatabaseName("ix_holds_held_expires_at");
        });
    }
}
