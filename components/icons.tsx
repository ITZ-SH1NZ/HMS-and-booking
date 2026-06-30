// Icon set — thin re-exports of lucide-react under the names used across the
// app, plus a couple of small wrappers. Use any other lucide icon directly:
//   import { Sparkles } from "lucide-react";
import {
  Search,
  MapPin,
  Calendar,
  User,
  Users,
  MoreHorizontal,
  Check,
  CircleCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Plus,
  Minus,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Clock,
  Ban,
  Globe,
  BedDouble,
  Building2,
  Umbrella,
  Mountain,
  TreePine,
  Gem,
  Wallet,
  Tag,
  Shield,
  Headphones,
  ArrowRight,
  ArrowLeft,
  Pencil,
  Zap,
  Star,
  Heart,
  CreditCard,
  Camera,
  Trash2,
  Navigation,
  UploadCloud,
  Share2,
  Image,
  LayoutGrid,
  X,
  MessageSquare,
  type LucideProps,
} from "lucide-react";


export const SearchIcon = Search;
export const MapPinIcon = MapPin;
export const CalendarIcon = Calendar;
export const UserIcon = User;
export const UsersIcon = Users;
export const CheckIcon = Check;
export const CheckCircleIcon = CircleCheck;
export const ChevronDownIcon = ChevronDown;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const PlusIcon = Plus;
export const MinusIcon = Minus;
export const LockIcon = Lock;
export const EyeIcon = Eye;
export const EyeOffIcon = EyeOff;
export const PhoneIcon = Phone;
export const MailIcon = Mail;
export const ClockIcon = Clock;
export const BanIcon = Ban;
export const GlobeIcon = Globe;
export const BedIcon = BedDouble;
export const BuildingIcon = Building2;
export const UmbrellaIcon = Umbrella;
export const MountainIcon = Mountain;
export const TreeIcon = TreePine;
export const GemIcon = Gem;
export const WalletIcon = Wallet;
export const TagIcon = Tag;
export const ShieldIcon = Shield;
export const HeadphonesIcon = Headphones;
export const ArrowRightIcon = ArrowRight;
export const ArrowLeftIcon = ArrowLeft;
export const PencilIcon = Pencil;
export const BoltIcon = Zap;
export const CreditCardIcon = CreditCard;
export const CameraIcon = Camera;
export const TrashIcon = Trash2;
export const NavigationIcon = Navigation;
export const UploadIcon = UploadCloud;
export const ChevronUpIcon = ChevronUp;
export const ShareIcon = Share2;
export const ImageIcon = Image;
export const GridIcon = LayoutGrid;
export const XIcon = X;
export const MoreIcon = MoreHorizontal;
export const MessageSquareIcon = MessageSquare;


// Star / Heart support a `filled` convenience prop.
export function StarIcon({
  filled,
  ...props
}: LucideProps & { filled?: boolean }) {
  return <Star {...props} fill={filled ? "currentColor" : "none"} />;
}

export function HeartIcon({
  filled,
  ...props
}: LucideProps & { filled?: boolean }) {
  return <Heart {...props} fill={filled ? "currentColor" : "none"} />;
}

// Google's multi-colour "G" — a brand mark, not a lucide icon.
export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.76-3.77H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.32a7.2 7.2 0 0 1 0-4.63v-3.1H1.29a12 12 0 0 0 0 10.83l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.59l4.01 3.1A7.2 7.2 0 0 1 12 4.75z"
      />
    </svg>
  );
}
