// AsyncAPI Documentation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Toggle tag sections
    document.querySelectorAll('.tag-header').forEach(header => {
        header.addEventListener('click', function() {
            const section = this.parentElement;
            section.classList.toggle('expanded');
        });
    });

    // Toggle operation details
    document.querySelectorAll('.operation-header').forEach(header => {
        header.addEventListener('click', function() {
            const operation = this.parentElement;
            operation.classList.toggle('expanded');
        });
    });

    // Expand first section by default
    const firstSection = document.querySelector('.tag-section');
    if (firstSection) {
        firstSection.classList.add('expanded');
    }
});